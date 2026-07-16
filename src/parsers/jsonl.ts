import { parseClaudeJsonl } from "./claude";
import { parseCodexJsonl } from "./codex";
import type { ParsedSource } from "../core/types";
import { asRecord } from "../core/normalize";
import {
  isOversizedJsonlLine,
  iterateJsonlLines,
} from "./limits";

const DETECTION_RECORD_LIMIT = 80;

export type JsonlProvider = "codex" | "claude";

export function detectJsonlProvider(text: string): JsonlProvider | undefined {
  let codexScore = 0;
  let claudeScore = 0;
  let inspected = 0;

  for (const line of iterateJsonlLines(text)) {
    if (line.length === 0) {
      continue;
    }

    if (isOversizedJsonlLine(line)) {
      inspected += 1;
    } else if (line.trim()) {
      inspected += 1;
      try {
        const record = asRecord(JSON.parse(line));
        if (record) {
          if (
            record.type === "session_meta" ||
            record.type === "turn_context" ||
            (record.type === "event_msg" &&
              asRecord(record.payload)?.type === "task_started")
          ) {
            codexScore += 2;
          }

          if (
            (record.type === "assistant" ||
              record.type === "user" ||
              record.type === "system") &&
            ("sessionId" in record || "uuid" in record)
          ) {
            claudeScore += 1;
          }
        }
      } catch {
        // Detection intentionally ignores malformed rows.
      }
    }

    if (inspected >= DETECTION_RECORD_LIMIT) {
      break;
    }
  }

  if (codexScore === 0 && claudeScore === 0) {
    return undefined;
  }

  return codexScore >= claudeScore ? "codex" : "claude";
}

export function parseJsonlText(text: string): ParsedSource | undefined {
  const provider = detectJsonlProvider(text);
  if (provider === "codex") {
    return parseCodexJsonl(text);
  }
  if (provider === "claude") {
    return parseClaudeJsonl(text);
  }
  return undefined;
}
