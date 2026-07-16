import type { TokenUsage, WarningCode } from "./types";

const MAX_MODEL_LENGTH = 120;
const MODEL_PATTERN = /^[\p{L}\p{N}._:/+@()[\] -]+$/u;

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return value;
}

export function asSafeCount(value: unknown): number | undefined {
  const number = asFiniteNumber(value);
  if (number === undefined) {
    return undefined;
  }

  return Math.min(Math.round(number), Number.MAX_SAFE_INTEGER);
}

export function toIsoTimestamp(value: unknown): string | undefined {
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  const number = asFiniteNumber(value);
  if (number === undefined) {
    return undefined;
  }

  const millis = number < 10_000_000_000 ? number * 1_000 : number;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function durationBetween(
  startedAt: string,
  endedAt: string | undefined,
): number | undefined {
  if (!endedAt) {
    return undefined;
  }

  const duration = Date.parse(endedAt) - Date.parse(startedAt);
  return Number.isFinite(duration) && duration >= 0 ? duration : undefined;
}

export function safeModel(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (
    normalized.length === 0 ||
    normalized.length > MAX_MODEL_LENGTH ||
    !MODEL_PATTERN.test(normalized)
  ) {
    return undefined;
  }

  return normalized;
}

export function readTokenUsage(
  value: unknown,
  mapping: {
    input: string;
    output: string;
    cacheRead?: string;
    cacheWrite?: string;
    reasoning?: string;
    total?: string;
  },
  totalMode: "reported" | "sum-exclusive" = "reported",
): TokenUsage {
  const record = asRecord(value);
  if (!record) {
    return {};
  }

  const usage: TokenUsage = {
    input: asSafeCount(record[mapping.input]),
    output: asSafeCount(record[mapping.output]),
    cacheRead: mapping.cacheRead
      ? asSafeCount(record[mapping.cacheRead])
      : undefined,
    cacheWrite: mapping.cacheWrite
      ? asSafeCount(record[mapping.cacheWrite])
      : undefined,
    reasoning: mapping.reasoning
      ? asSafeCount(record[mapping.reasoning])
      : undefined,
    total: mapping.total ? asSafeCount(record[mapping.total]) : undefined,
  };

  if (usage.total === undefined && totalMode === "sum-exclusive") {
    const parts = [
      usage.input,
      usage.output,
      usage.cacheRead,
      usage.cacheWrite,
    ].filter((part): part is number => part !== undefined);
    if (parts.length > 0) {
      usage.total = parts.reduce((sum, part) => sum + part, 0);
    }
  }

  return compactTokenUsage(usage);
}

export function compactTokenUsage(usage: TokenUsage): TokenUsage {
  return Object.fromEntries(
    Object.entries(usage).filter(([, value]) => value !== undefined),
  ) as TokenUsage;
}

export function addTokenUsage(...items: TokenUsage[]): TokenUsage {
  const result: TokenUsage = {};
  const keys = [
    "input",
    "output",
    "cacheRead",
    "cacheWrite",
    "reasoning",
    "total",
  ] as const;

  for (const key of keys) {
    const values = items
      .map((item) => item[key])
      .filter((value): value is number => value !== undefined);
    if (values.length > 0) {
      result[key] = values.reduce((sum, value) => sum + value, 0);
    }
  }

  return result;
}

export function subtractTokenUsage(
  current: TokenUsage,
  baseline: TokenUsage,
): TokenUsage {
  const result: TokenUsage = {};
  const keys = [
    "input",
    "output",
    "cacheRead",
    "cacheWrite",
    "reasoning",
    "total",
  ] as const;

  for (const key of keys) {
    const currentValue = current[key];
    if (currentValue === undefined) {
      continue;
    }

    const baselineValue = baseline[key] ?? 0;
    result[key] =
      currentValue >= baselineValue
        ? currentValue - baselineValue
        : currentValue;
  }

  return compactTokenUsage(result);
}

export function hasTokenUsage(usage: TokenUsage): boolean {
  return Object.values(usage).some((value) => value !== undefined);
}

export function uniqueWarnings(codes: WarningCode[]): WarningCode[] {
  return [...new Set(codes)];
}
