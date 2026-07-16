import type { AnalysisResult } from "./types";

export interface MetadataExport {
  schemaVersion: 1;
  product: "Turnspan";
  summary: {
    sources: number;
    runs: number;
    completed: number;
    interrupted: number;
    incomplete: number;
    tokens: number | null;
    longestCompletedRunId: string | null;
  };
  sources: Array<{
    sourceOrdinal: number;
    provider: string | null;
    runCount: number;
    skippedRecords: number;
    warningCodes: string[];
  }>;
  runs: Array<{
    id: string;
    provider: string;
    sourceOrdinal: number;
    turnOrdinal: number;
    startedAt: string;
    endedAt: string | null;
    durationMs: number | null;
    completionStatus: string;
    completionEvidence: string;
    inputTokens: number | null;
    outputTokens: number | null;
    cacheReadTokens: number | null;
    cacheWriteTokens: number | null;
    reasoningTokens: number | null;
    totalTokens: number | null;
    model: string | null;
    warningCodes: string[];
  }>;
}

export function createMetadataExport(result: AnalysisResult): MetadataExport {
  return {
    schemaVersion: 1,
    product: "Turnspan",
    summary: {
      sources: result.totals.sources,
      runs: result.totals.runs,
      completed: result.totals.completed,
      interrupted: result.totals.interrupted,
      incomplete: result.totals.incomplete,
      tokens: result.totals.tokens ?? null,
      longestCompletedRunId: result.longestCompletedRunId ?? null,
    },
    sources: result.sources.map((source) => ({
      sourceOrdinal: source.sourceOrdinal,
      provider: source.provider ?? null,
      runCount: source.runCount,
      skippedRecords:
        source.malformedRecords +
        source.oversizedRecords +
        source.ignoredRecords,
      warningCodes: [...source.warningCodes],
    })),
    runs: result.runs.map((run) => ({
      id: run.id,
      provider: run.provider,
      sourceOrdinal: run.sourceOrdinal,
      turnOrdinal: run.turnOrdinal,
      startedAt: run.startedAt,
      endedAt: run.endedAt ?? null,
      durationMs: run.durationMs ?? null,
      completionStatus: run.status,
      completionEvidence: run.completionEvidence,
      inputTokens: run.tokens.input ?? null,
      outputTokens: run.tokens.output ?? null,
      cacheReadTokens: run.tokens.cacheRead ?? null,
      cacheWriteTokens: run.tokens.cacheWrite ?? null,
      reasoningTokens: run.tokens.reasoning ?? null,
      totalTokens: run.tokens.total ?? null,
      model: run.model ?? null,
      warningCodes: [...run.warningCodes],
    })),
  };
}

export function serializeMetadataExport(result: AnalysisResult): string {
  return JSON.stringify(createMetadataExport(result), null, 2);
}
