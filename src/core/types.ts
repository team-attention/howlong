export type Provider = "codex" | "claude" | "opencode";

export type RunStatus = "completed" | "interrupted" | "incomplete";

export type CompletionEvidence =
  | "explicit-complete"
  | "explicit-duration"
  | "terminal-stop"
  | "terminal-error"
  | "explicit-abort"
  | "non-clean-terminal"
  | "missing-terminal-event";

export type WarningCode =
  | "MALFORMED_RECORDS_SKIPPED"
  | "OVERSIZED_RECORDS_SKIPPED"
  | "SIDECHAIN_RECORDS_SKIPPED"
  | "TOKEN_USAGE_PARTIAL"
  | "MODEL_UNAVAILABLE"
  | "BACKGROUND_WORK_PENDING"
  | "WAL_SNAPSHOT_MAY_BE_STALE"
  | "RUN_LIMIT_REACHED"
  | "UNSUPPORTED_SCHEMA"
  | "NO_VALID_RUNS";

export interface TokenUsage {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  reasoning?: number;
  total?: number;
}

export interface NormalizedRun {
  id: string;
  provider: Provider;
  sourceOrdinal: number;
  turnOrdinal: number;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  status: RunStatus;
  completionEvidence: CompletionEvidence;
  model?: string;
  tokens: TokenUsage;
  warningCodes: WarningCode[];
}

export interface ParsedSource {
  provider: Provider;
  runs: Omit<NormalizedRun, "id" | "sourceOrdinal" | "turnOrdinal">[];
  malformedRecords: number;
  oversizedRecords: number;
  ignoredRecords: number;
  warningCodes: WarningCode[];
}

export interface SourceSummary {
  sourceOrdinal: number;
  provider?: Provider;
  runCount: number;
  malformedRecords: number;
  oversizedRecords: number;
  ignoredRecords: number;
  warningCodes: WarningCode[];
}

export interface AnalysisResult {
  schemaVersion: 1;
  sources: SourceSummary[];
  runs: NormalizedRun[];
  longestCompletedRunId?: string;
  totals: {
    sources: number;
    runs: number;
    completed: number;
    interrupted: number;
    incomplete: number;
    tokens?: number;
  };
}

export type WorkerResponse =
  | {
      type: "ready";
    }
  | {
      type: "progress";
      completed: number;
      total: number;
    }
  | {
      type: "result";
      result: AnalysisResult;
    }
  | {
      type: "error";
      code:
        | "NO_FILES"
        | "TOO_MANY_FILES"
        | "FILE_TOO_LARGE"
        | "UNSUPPORTED_FILE"
        | "ANALYSIS_FAILED";
    };

export type WorkerRequest =
  | {
      type: "analyze";
      files: File[];
    }
  | {
      type: "cancel";
    };
