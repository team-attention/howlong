import type {
  CompletionEvidence,
  ParsedSource,
  RunStatus,
  TokenUsage,
  WarningCode,
} from "../core/types";
import {
  addTokenUsage,
  asFiniteNumber,
  asRecord,
  durationBetween,
  hasTokenUsage,
  maxTokenUsage,
  readTokenUsage,
  safeModel,
  toIsoTimestamp,
  uniqueWarnings,
} from "../core/normalize";
import {
  isOversizedJsonlLine,
  iterateJsonlLines,
} from "./limits";

interface ClaudeRunBuilder {
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: RunStatus;
  completionEvidence: CompletionEvidence;
  model?: string;
  lastAssistantAt?: string;
  lastStopReason?: string;
  assistantMessageIds: Set<string>;
  usageByMessage: Map<string, TokenUsage>;
  warningCodes: WarningCode[];
}

const CLAUDE_TOKEN_MAPPING = {
  input: "input_tokens",
  output: "output_tokens",
  cacheRead: "cache_read_input_tokens",
  cacheWrite: "cache_creation_input_tokens",
  reasoning: "reasoning_tokens",
} as const;

function isHumanUserRecord(record: Record<string, unknown>): boolean {
  const message = asRecord(record.message);
  const content = message?.content;
  const containsToolResult =
    Array.isArray(content) &&
    content.some((block) => asRecord(block)?.type === "tool_result");
  return (
    record.type === "user" &&
    !("toolUseResult" in record) &&
    !("sourceToolAssistantUUID" in record) &&
    !containsToolResult &&
    record.isMeta !== true
  );
}

function isTerminalStop(reason: string | undefined): boolean {
  return reason === "end_turn" || reason === "stop_sequence";
}

function mergeClaudeUsage(
  current: TokenUsage,
  next: TokenUsage,
): TokenUsage {
  const merged = maxTokenUsage(current, next);
  const exclusive = [
    merged.input,
    merged.output,
    merged.cacheRead,
    merged.cacheWrite,
  ].filter((value): value is number => value !== undefined);
  if (exclusive.length > 0) {
    merged.total = exclusive.reduce((sum, value) => sum + value, 0);
  }
  return merged;
}

function finalize(builder: ClaudeRunBuilder) {
  const tokens = addTokenUsage(...builder.usageByMessage.values());
  const warningCodes = [...builder.warningCodes];
  if (!hasTokenUsage(tokens)) {
    warningCodes.push("TOKEN_USAGE_PARTIAL");
  }
  if (!builder.model) {
    warningCodes.push("MODEL_UNAVAILABLE");
  }

  return {
    provider: "claude" as const,
    startedAt: builder.startedAt,
    endedAt: builder.endedAt,
    durationMs:
      builder.durationMs ?? durationBetween(builder.startedAt, builder.endedAt),
    status: builder.status,
    completionEvidence: builder.completionEvidence,
    model: builder.model,
    tokens,
    warningCodes: uniqueWarnings(warningCodes),
  };
}

export function parseClaudeJsonl(text: string): ParsedSource {
  const runs: ReturnType<typeof finalize>[] = [];
  let active: ClaudeRunBuilder | undefined;
  let malformedRecords = 0;
  let oversizedRecords = 0;
  let ignoredRecords = 0;

  const closeActiveForBoundary = (endedAt?: string) => {
    if (!active) {
      return;
    }

    if (isTerminalStop(active.lastStopReason) && active.lastAssistantAt) {
      active.status = "completed";
      active.completionEvidence = "terminal-stop";
      active.endedAt = active.lastAssistantAt;
    } else {
      active.status = "incomplete";
      active.completionEvidence = "missing-terminal-event";
      active.endedAt = endedAt;
    }
    runs.push(finalize(active));
    active = undefined;
  };

  for (const line of iterateJsonlLines(text)) {
    if (line.length === 0) {
      continue;
    }
    if (isOversizedJsonlLine(line)) {
      oversizedRecords += 1;
      continue;
    }
    if (!line.trim()) {
      continue;
    }

    let record: Record<string, unknown> | undefined;
    try {
      record = asRecord(JSON.parse(line));
    } catch {
      malformedRecords += 1;
      continue;
    }

    if (!record) {
      malformedRecords += 1;
      continue;
    }

    if (
      record.type === "user" &&
      typeof record.interruptedMessageId === "string"
    ) {
      if (
        active?.assistantMessageIds.has(record.interruptedMessageId)
      ) {
        active.status = "interrupted";
        active.completionEvidence = "explicit-abort";
        active.endedAt = toIsoTimestamp(record.timestamp);
        runs.push(finalize(active));
        active = undefined;
      } else {
        ignoredRecords += 1;
      }
      continue;
    }

    if (isHumanUserRecord(record)) {
      const startedAt = toIsoTimestamp(record.timestamp);
      if (!startedAt) {
        malformedRecords += 1;
        continue;
      }
      closeActiveForBoundary(startedAt);
      active = {
        startedAt,
        status: "incomplete",
        completionEvidence: "missing-terminal-event",
        assistantMessageIds: new Set(),
        usageByMessage: new Map(),
        warningCodes: [],
      };
      continue;
    }

    if (record.type === "assistant") {
      if (!active) {
        ignoredRecords += 1;
        continue;
      }

      const message = asRecord(record.message);
      if (!message) {
        malformedRecords += 1;
        continue;
      }

      const timestamp = toIsoTimestamp(record.timestamp);
      if (timestamp) {
        active.lastAssistantAt = timestamp;
      }
      const model = safeModel(message.model);
      if (model) {
        active.model = model;
      }
      if (typeof message.stop_reason === "string") {
        active.lastStopReason = message.stop_reason;
      }
      if (typeof message.id === "string") {
        active.assistantMessageIds.add(message.id);
      }

      const usage = readTokenUsage(
        message.usage,
        CLAUDE_TOKEN_MAPPING,
        "sum-exclusive",
      );
      if (hasTokenUsage(usage)) {
        const key =
          typeof message.id === "string"
            ? message.id
            : typeof record.requestId === "string"
              ? record.requestId
              : typeof record.uuid === "string"
                ? record.uuid
                : `usage-${active.usageByMessage.size + 1}`;
        active.usageByMessage.set(
          key,
          mergeClaudeUsage(active.usageByMessage.get(key) ?? {}, usage),
        );
      }

      const hasAssistantError =
        message.error !== undefined ||
        record.error !== undefined ||
        record.isApiErrorMessage === true;
      if (hasAssistantError) {
        active.endedAt = timestamp;
        active.status = "incomplete";
        active.completionEvidence = "terminal-error";
        runs.push(finalize(active));
        active = undefined;
      }
      continue;
    }

    if (
      record.type === "system" &&
      record.subtype === "turn_duration" &&
      active
    ) {
      active.endedAt =
        toIsoTimestamp(record.timestamp) ?? active.lastAssistantAt;
      active.durationMs = asFiniteNumber(record.durationMs);
      const pendingBackground =
        (asFiniteNumber(record.pendingBackgroundAgentCount) ?? 0) > 0 ||
        (asFiniteNumber(record.pendingWorkflowCount) ?? 0) > 0;
      const nonCleanStop =
        active.lastStopReason !== undefined &&
        !isTerminalStop(active.lastStopReason);
      active.status =
        pendingBackground || nonCleanStop ? "incomplete" : "completed";
      active.completionEvidence = pendingBackground
        ? "missing-terminal-event"
        : nonCleanStop
          ? "non-clean-terminal"
          : "explicit-duration";
      if (pendingBackground) {
        active.warningCodes.push("BACKGROUND_WORK_PENDING");
      }
      runs.push(finalize(active));
      active = undefined;
      continue;
    }

    ignoredRecords += 1;
  }

  closeActiveForBoundary();

  const warningCodes: WarningCode[] = [];
  if (malformedRecords > 0) {
    warningCodes.push("MALFORMED_RECORDS_SKIPPED");
  }
  if (oversizedRecords > 0) {
    warningCodes.push("OVERSIZED_RECORDS_SKIPPED");
  }
  if (runs.length === 0) {
    warningCodes.push("NO_VALID_RUNS");
  }

  return {
    provider: "claude",
    runs,
    malformedRecords,
    oversizedRecords,
    ignoredRecords,
    warningCodes,
  };
}
