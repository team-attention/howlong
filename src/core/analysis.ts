import type {
  AnalysisResult,
  NormalizedRun,
  ParsedSource,
  SourceSummary,
} from "./types";
import { uniqueWarnings } from "./normalize";

export function buildAnalysisResult(
  sources: Array<ParsedSource | undefined>,
): AnalysisResult {
  const runs: NormalizedRun[] = [];
  const summaries: SourceSummary[] = [];
  const providerOrdinals = new Map<string, number>();

  sources.forEach((source, index) => {
    const sourceOrdinal = index + 1;
    if (!source) {
      summaries.push({
        sourceOrdinal,
        runCount: 0,
        malformedRecords: 0,
        oversizedRecords: 0,
        ignoredRecords: 0,
        warningCodes: ["UNSUPPORTED_SCHEMA", "NO_VALID_RUNS"],
      });
      return;
    }

    summaries.push({
      sourceOrdinal,
      provider: source.provider,
      runCount: source.runs.length,
      malformedRecords: source.malformedRecords,
      oversizedRecords: source.oversizedRecords,
      ignoredRecords: source.ignoredRecords,
      warningCodes: uniqueWarnings(source.warningCodes),
    });

    source.runs.forEach((run, indexWithinSource) => {
      const nextProviderOrdinal =
        (providerOrdinals.get(source.provider) ?? 0) + 1;
      providerOrdinals.set(source.provider, nextProviderOrdinal);
      runs.push({
        ...run,
        id: `${source.provider}-${String(nextProviderOrdinal).padStart(3, "0")}`,
        sourceOrdinal,
        turnOrdinal: indexWithinSource + 1,
      });
    });
  });

  runs.sort((left, right) => {
    const time = Date.parse(left.startedAt) - Date.parse(right.startedAt);
    return time || left.id.localeCompare(right.id);
  });

  const longest = runs
    .filter(
      (run) =>
        run.status === "completed" &&
        run.endedAt !== undefined &&
        run.durationMs !== undefined,
    )
    .sort((left, right) => {
      const duration = (right.durationMs ?? 0) - (left.durationMs ?? 0);
      const started = left.startedAt.localeCompare(right.startedAt);
      return duration || started || left.id.localeCompare(right.id);
    })[0];

  const tokenValues = runs
    .map((run) => run.tokens.total)
    .filter((value): value is number => value !== undefined);

  return {
    schemaVersion: 1,
    sources: summaries,
    runs,
    longestCompletedRunId: longest?.id,
    totals: {
      sources: summaries.length,
      runs: runs.length,
      completed: runs.filter((run) => run.status === "completed").length,
      interrupted: runs.filter((run) => run.status === "interrupted").length,
      incomplete: runs.filter((run) => run.status === "incomplete").length,
      tokens:
        tokenValues.length > 0
          ? tokenValues.reduce((sum, value) => sum + value, 0)
          : undefined,
    },
  };
}
