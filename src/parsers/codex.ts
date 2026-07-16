import type {
  CompletionEvidence,
  ParsedSource,
  RunStatus,
  TokenUsage,
  WarningCode,
} from "../core/types";
import {
  asFiniteNumber,
  asRecord,
  durationBetween,
  hasTokenUsage,
  readTokenUsage,
  safeModel,
  subtractTokenUsage,
  toIsoTimestamp,
  uniqueWarnings,
} from "../core/normalize";
import {
  isOversizedJsonlLine,
  iterateJsonlLines,
} from "./limits";

interface CodexRunBuilder {
  turnId?: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: RunStatus;
  completionEvidence: CompletionEvidence;
  model?: string;
  baselineTokens: TokenUsage;
  latestTokens: TokenUsage;
  sawFreshTokenSnapshot: boolean;
  warningCodes: WarningCode[];
}

const CODEX_TOKEN_MAPPING = {
  input: "input_tokens",
  output: "output_tokens",
  cacheRead: "cached_input_tokens",
  cacheWrite: "cache_write_input_tokens",
  reasoning: "reasoning_output_tokens",
  total: "total_tokens",
} as const;

function finalize(builder: CodexRunBuilder) {
  const tokens = builder.sawFreshTokenSnapshot
    ? subtractTokenUsage(builder.latestTokens, builder.baselineTokens)
    : {};
  const warningCodes = [...builder.warningCodes];
  if (!hasTokenUsage(tokens)) {
    warningCodes.push("TOKEN_USAGE_PARTIAL");
  }
  if (!builder.model) {
    warningCodes.push("MODEL_UNAVAILABLE");
  }

  return {
    provider: "codex" as const,
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

export function parseCodexJsonl(text: string): ParsedSource {
  const active = new Map<string, CodexRunBuilder>();
  const modelByTurn = new Map<string, string>();
  const runs: ReturnType<typeof finalize>[] = [];
  let latestCumulative: TokenUsage = {};
  let mostRecentTurnId: string | undefined;
  let latestModel: string | undefined;
  let malformedRecords = 0;
  let oversizedRecords = 0;
  let ignoredRecords = 0;

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

    const payload = asRecord(record.payload);
    if (record.type === "turn_context" && payload) {
      const turnId =
        typeof payload.turn_id === "string" ? payload.turn_id : undefined;
      const model = safeModel(payload.model);
      if (turnId && model) {
        latestModel = model;
        modelByTurn.set(turnId, model);
        const builder = active.get(turnId);
        if (builder) {
          builder.model = model;
        }
      }
      continue;
    }

    if (record.type !== "event_msg" || !payload) {
      ignoredRecords += 1;
      continue;
    }

    const eventType = payload.type;
    if (eventType === "thread_settings_applied") {
      const settings = asRecord(payload.thread_settings);
      latestModel = safeModel(settings?.model) ?? latestModel;
      continue;
    }

    if (eventType === "task_started" || eventType === "turn_started") {
      const startedAt =
        toIsoTimestamp(payload.started_at) ?? toIsoTimestamp(record.timestamp);
      if (!startedAt) {
        malformedRecords += 1;
        continue;
      }

      const turnId =
        typeof payload.turn_id === "string"
          ? payload.turn_id
          : `anonymous-${runs.length + active.size + 1}`;
      active.set(turnId, {
        turnId,
        startedAt,
        status: "incomplete",
        completionEvidence: "missing-terminal-event",
        model: modelByTurn.get(turnId) ?? latestModel,
        baselineTokens: latestCumulative,
        latestTokens: latestCumulative,
        sawFreshTokenSnapshot: false,
        warningCodes: [],
      });
      mostRecentTurnId = turnId;
      continue;
    }

    if (eventType === "token_count") {
      const info = asRecord(payload.info);
      const usage = readTokenUsage(
        info?.total_token_usage,
        CODEX_TOKEN_MAPPING,
      );
      if (hasTokenUsage(usage)) {
        latestCumulative = usage;
        if (mostRecentTurnId) {
          const builder = active.get(mostRecentTurnId);
          if (builder) {
            builder.latestTokens = usage;
            builder.sawFreshTokenSnapshot = true;
          }
        }
      }
      continue;
    }

    if (
      eventType !== "task_complete" &&
      eventType !== "turn_complete" &&
      eventType !== "turn_aborted"
    ) {
      ignoredRecords += 1;
      continue;
    }

    const turnId =
      typeof payload.turn_id === "string"
        ? payload.turn_id
        : mostRecentTurnId;
    const builder = turnId ? active.get(turnId) : undefined;
    if (!builder || !turnId) {
      ignoredRecords += 1;
      continue;
    }

    builder.endedAt =
      toIsoTimestamp(payload.completed_at) ?? toIsoTimestamp(record.timestamp);
    builder.durationMs = asFiniteNumber(payload.duration_ms);
    const hasError = payload.error !== undefined && payload.error !== null;
    builder.status =
      eventType === "turn_aborted"
        ? "interrupted"
        : hasError
          ? "incomplete"
          : "completed";
    builder.completionEvidence =
      eventType === "turn_aborted"
        ? "explicit-abort"
        : hasError
          ? "terminal-error"
          : "explicit-complete";
    runs.push(finalize(builder));
    active.delete(turnId);
    mostRecentTurnId = [...active.keys()].at(-1);
  }

  for (const builder of active.values()) {
    runs.push(finalize(builder));
  }

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
    provider: "codex",
    runs,
    malformedRecords,
    oversizedRecords,
    ignoredRecords,
    warningCodes,
  };
}
