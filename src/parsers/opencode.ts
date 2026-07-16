import sqlite3InitModule, {
  type Database,
  type Sqlite3Static,
} from "@sqlite.org/sqlite-wasm";
import type {
  ParsedSource,
  TokenUsage,
  WarningCode,
} from "../core/types";
import {
  addTokenUsage,
  asSafeCount,
  durationBetween,
  hasTokenUsage,
  safeModel,
  toIsoTimestamp,
  uniqueWarnings,
} from "../core/normalize";

const SQLITE_HEADER = "SQLite format 3\0";
const SQLITE_DESERIALIZE_PADDING_BYTES = 64;
const CLEAN_TERMINAL_FINISH_REASONS = new Set([
  "stop",
  "end_turn",
  "stop_sequence",
]);
const NON_TERMINAL_FINISH_REASONS = new Set(["tool-calls", "unknown"]);

let sqlitePromise: Promise<Sqlite3Static> | undefined;

interface OpenCodeMessage {
  rowId: string;
  sessionId: string;
  groupId: string;
  createdAt: string;
  completedAt?: string;
  model?: string;
  finish?: string;
  errorName?: string;
  tokens: TokenUsage;
}

interface OpenCodeGroup {
  groupId: string;
  sessionId: string;
  startedAt?: string;
  assistants: OpenCodeMessage[];
}

interface OpenCodeRows {
  groups: OpenCodeGroup[];
  malformedRecords: number;
  ignoredRecords: number;
}

export function isSqliteBytes(bytes: Uint8Array): boolean {
  if (bytes.byteLength < SQLITE_HEADER.length) {
    return false;
  }

  return (
    new TextDecoder("utf-8").decode(bytes.subarray(0, SQLITE_HEADER.length)) ===
    SQLITE_HEADER
  );
}

export function prepareOpenCodeParser(): Promise<Sqlite3Static> {
  sqlitePromise ??= sqlite3InitModule();
  return sqlitePromise;
}

function normalizeSqliteImage(bytes: Uint8Array): {
  bytes: Uint8Array;
  wasWal: boolean;
} {
  const copy = bytes.slice();
  const wasWal = copy[18] === 2 || copy[19] === 2;
  if (wasWal) {
    copy[18] = 1;
    copy[19] = 1;
  }
  return { bytes: copy, wasWal };
}

function openReadonlyDatabase(
  sqlite3: Sqlite3Static,
  bytes: Uint8Array,
): { db: Database; wasWal: boolean } {
  const normalized = normalizeSqliteImage(bytes);
  const db = new sqlite3.oo1.DB(":memory:", "c");
  const dbSize = normalized.bytes.byteLength;
  const bufferSize = dbSize + SQLITE_DESERIALIZE_PADDING_BYTES;
  let pointer: ReturnType<typeof sqlite3.capi.sqlite3_malloc> | undefined;
  let ownershipTransferred = false;
  let result: number;

  try {
    pointer = sqlite3.capi.sqlite3_malloc(bufferSize);
    if (!pointer) {
      throw new Error("SQLite allocation failed");
    }
    const offset = Number(pointer);
    const heap = sqlite3.wasm.heap8u();
    heap.fill(0, offset, offset + bufferSize);
    heap.set(normalized.bytes, offset);
    ownershipTransferred = true;
    result = sqlite3.capi.sqlite3_deserialize(
      db.pointer!,
      "main",
      pointer,
      dbSize,
      bufferSize,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
        sqlite3.capi.SQLITE_DESERIALIZE_READONLY,
    );
  } catch {
    if (
      pointer !== undefined &&
      Number(pointer) !== 0 &&
      !ownershipTransferred
    ) {
      sqlite3.capi.sqlite3_free(pointer);
    }
    db.close();
    throw new Error("Unsupported SQLite source");
  }

  if (result !== sqlite3.capi.SQLITE_OK) {
    db.close();
    throw new Error("Unsupported SQLite source");
  }

  try {
    const integrity = db.exec({
      sql: "PRAGMA integrity_check",
      rowMode: 0,
      returnValue: "resultRows",
    });
    if (integrity.length !== 1 || integrity[0] !== "ok") {
      throw new Error("Invalid SQLite snapshot");
    }
  } catch {
    db.close();
    throw new Error("Invalid SQLite snapshot");
  }

  return { db, wasWal: normalized.wasWal };
}

function tokenUsageFromRow(row: Record<string, unknown>): TokenUsage {
  const usage: TokenUsage = {
    input: asSafeCount(row.tokens_input),
    output: asSafeCount(row.tokens_output),
    reasoning: asSafeCount(row.tokens_reasoning),
    cacheRead: asSafeCount(row.tokens_cache_read),
    cacheWrite: asSafeCount(row.tokens_cache_write),
    total: asSafeCount(row.tokens_total),
  };
  if (usage.total === undefined) {
    const parts = [
      usage.input,
      usage.output,
      usage.reasoning,
      usage.cacheRead,
      usage.cacheWrite,
    ].filter((part): part is number => part !== undefined);
    if (parts.length > 0) {
      usage.total = parts.reduce((sum, part) => sum + part, 0);
    }
  }
  return usage;
}

function modelFromRow(row: Record<string, unknown>): string | undefined {
  const provider = safeModel(row.provider_id);
  const model = safeModel(row.model_id);
  if (provider && model) {
    return safeModel(`${provider}/${model}`);
  }
  return model ?? provider;
}

function listTables(db: Database): Set<string> {
  return new Set(
    db
      .exec({
        sql: "SELECT name FROM sqlite_master WHERE type = 'table'",
        rowMode: 0,
        returnValue: "resultRows",
      })
      .filter((name): name is string => typeof name === "string"),
  );
}

function tableColumns(db: Database, table: string): Set<string> {
  const query =
    table === "message"
      ? 'PRAGMA table_info("message")'
      : 'PRAGMA table_info("session_message")';
  return new Set(
    db
      .exec({
        sql: query,
        rowMode: "object",
        returnValue: "resultRows",
      })
      .map((column) => column.name)
      .filter((name): name is string => typeof name === "string"),
  );
}

function parseLegacyRows(db: Database): OpenCodeRows {
  const userStarts = new Map<string, string>();
  const groupMap = new Map<string, OpenCodeGroup>();
  let malformedRecords = 0;
  let ignoredRecords = 0;

  const invalid = db.exec({
    sql: 'SELECT count(*) AS count FROM "message" WHERE NOT json_valid(data)',
    rowMode: "object",
    returnValue: "resultRows",
  })[0]?.count;
  malformedRecords += asSafeCount(invalid) ?? 0;

  const statement = db.prepare(`
    SELECT
      id,
      session_id,
      time_created,
      json_extract(data, '$.role') AS role,
      json_extract(data, '$.parentID') AS parent_id,
      json_extract(data, '$.time.created') AS data_created,
      json_extract(data, '$.time.completed') AS data_completed,
      json_extract(data, '$.modelID') AS model_id,
      json_extract(data, '$.providerID') AS provider_id,
      json_extract(data, '$.finish') AS finish,
      json_extract(data, '$.error.name') AS error_name,
      json_extract(data, '$.tokens.total') AS tokens_total,
      json_extract(data, '$.tokens.input') AS tokens_input,
      json_extract(data, '$.tokens.output') AS tokens_output,
      json_extract(data, '$.tokens.reasoning') AS tokens_reasoning,
      json_extract(data, '$.tokens.cache.read') AS tokens_cache_read,
      json_extract(data, '$.tokens.cache.write') AS tokens_cache_write
    FROM "message"
    WHERE json_valid(data)
      AND json_extract(data, '$.role') IN ('user', 'assistant')
    ORDER BY time_created, id
  `);

  try {
    while (statement.step()) {
      const row = statement.get({});
      if (
        typeof row.id !== "string" ||
        typeof row.session_id !== "string"
      ) {
        ignoredRecords += 1;
        continue;
      }
      const createdAt =
        toIsoTimestamp(row.data_created) ?? toIsoTimestamp(row.time_created);
      if (!createdAt) {
        malformedRecords += 1;
        continue;
      }

      if (row.role === "user") {
        userStarts.set(`${row.session_id}\0${row.id}`, createdAt);
        continue;
      }
      if (row.role !== "assistant" || typeof row.parent_id !== "string") {
        ignoredRecords += 1;
        continue;
      }

      const key = `${row.session_id}\0${row.parent_id}`;
      const message: OpenCodeMessage = {
        rowId: row.id,
        sessionId: row.session_id,
        groupId: row.parent_id,
        createdAt,
        completedAt: toIsoTimestamp(row.data_completed),
        model: modelFromRow(row),
        finish: typeof row.finish === "string" ? row.finish : undefined,
        errorName:
          typeof row.error_name === "string" ? row.error_name : undefined,
        tokens: tokenUsageFromRow(row),
      };
      const group = groupMap.get(key);
      if (group) {
        group.assistants.push(message);
      } else {
        groupMap.set(key, {
          groupId: row.parent_id,
          sessionId: row.session_id,
          startedAt: userStarts.get(key),
          assistants: [message],
        });
      }
    }
  } finally {
    statement.finalize();
  }

  return {
    groups: [...groupMap.values()],
    malformedRecords,
    ignoredRecords,
  };
}

function parseV2Rows(db: Database, hasSequence: boolean): OpenCodeRows {
  const groupMap = new Map<string, OpenCodeGroup>();
  const currentGroupBySession = new Map<string, string>();
  let malformedRecords = 0;
  let ignoredRecords = 0;

  const invalid = db.exec({
    sql: 'SELECT count(*) AS count FROM "session_message" WHERE NOT json_valid(data)',
    rowMode: "object",
    returnValue: "resultRows",
  })[0]?.count;
  malformedRecords += asSafeCount(invalid) ?? 0;

  const statement = db.prepare(`
    SELECT
      id,
      session_id,
      type,
      time_created,
      json_extract(data, '$.time.created') AS data_created,
      json_extract(data, '$.time.completed') AS data_completed,
      json_extract(data, '$.model.id') AS model_id,
      json_extract(data, '$.model.providerID') AS provider_id,
      json_extract(data, '$.finish') AS finish,
      json_extract(data, '$.error.type') AS error_name,
      json_extract(data, '$.tokens.input') AS tokens_input,
      json_extract(data, '$.tokens.output') AS tokens_output,
      json_extract(data, '$.tokens.reasoning') AS tokens_reasoning,
      json_extract(data, '$.tokens.cache.read') AS tokens_cache_read,
      json_extract(data, '$.tokens.cache.write') AS tokens_cache_write
    FROM "session_message"
    WHERE json_valid(data) AND type IN ('user', 'assistant')
    ORDER BY session_id, ${hasSequence ? "seq" : "time_created, id"}
  `);

  try {
    while (statement.step()) {
      const row = statement.get({});
      if (typeof row.id !== "string" || typeof row.session_id !== "string") {
        malformedRecords += 1;
        continue;
      }
      const createdAt =
        toIsoTimestamp(row.data_created) ?? toIsoTimestamp(row.time_created);
      if (!createdAt) {
        malformedRecords += 1;
        continue;
      }

      if (row.type === "user") {
        const key = `${row.session_id}\0${row.id}`;
        currentGroupBySession.set(row.session_id, key);
        groupMap.set(key, {
          groupId: row.id,
          sessionId: row.session_id,
          startedAt: createdAt,
          assistants: [],
        });
        continue;
      }
      if (row.type !== "assistant") {
        ignoredRecords += 1;
        continue;
      }

      const key = currentGroupBySession.get(row.session_id);
      const group = key ? groupMap.get(key) : undefined;
      if (!group) {
        ignoredRecords += 1;
        continue;
      }

      group.assistants.push({
        rowId: row.id,
        sessionId: row.session_id,
        groupId: group.groupId,
        createdAt,
        completedAt: toIsoTimestamp(row.data_completed),
        model: modelFromRow(row),
        finish: typeof row.finish === "string" ? row.finish : undefined,
        errorName:
          typeof row.error_name === "string" ? row.error_name : undefined,
        tokens: tokenUsageFromRow(row),
      });
    }
  } finally {
    statement.finalize();
  }

  return {
    groups: [...groupMap.values()].filter(
      (group) => group.assistants.length > 0,
    ),
    malformedRecords,
    ignoredRecords,
  };
}

function normalizeGroups(groups: OpenCodeGroup[]) {
  return groups.map((group) => {
    group.assistants.sort((left, right) => {
      const time = left.createdAt.localeCompare(right.createdAt);
      return time || left.rowId.localeCompare(right.rowId);
    });

    const first = group.assistants[0]!;
    const last = group.assistants.at(-1)!;
    const startedAt = group.startedAt ?? first.createdAt;
    const completed = group.assistants
      .map((message) => message.completedAt)
      .filter((value): value is string => value !== undefined)
      .sort();
    const endedAt = completed.at(-1);
    const aborted = group.assistants.some(
      (message) => message.errorName === "MessageAbortedError",
    );
    const errored =
      group.assistants.some((message) => message.errorName !== undefined) ||
      last.finish === "content-filter" ||
      last.finish === "error";
    const finish = last.finish?.toLowerCase();
    const cleanTerminalFinish =
      last.completedAt !== undefined &&
      finish !== undefined &&
      CLEAN_TERMINAL_FINISH_REASONS.has(finish);
    const nonCleanTerminalFinish =
      last.completedAt !== undefined &&
      finish !== undefined &&
      !CLEAN_TERMINAL_FINISH_REASONS.has(finish) &&
      !NON_TERMINAL_FINISH_REASONS.has(finish);

    const status = aborted
      ? ("interrupted" as const)
      : errored
        ? ("incomplete" as const)
        : cleanTerminalFinish
          ? ("completed" as const)
          : ("incomplete" as const);
    const completionEvidence = aborted
      ? ("explicit-abort" as const)
      : errored
        ? ("terminal-error" as const)
        : cleanTerminalFinish
          ? ("explicit-complete" as const)
          : nonCleanTerminalFinish
            ? ("non-clean-terminal" as const)
            : ("missing-terminal-event" as const);
    const tokens = addTokenUsage(
      ...group.assistants.map((message) => message.tokens),
    );
    const warningCodes: WarningCode[] = [];
    if (!hasTokenUsage(tokens)) {
      warningCodes.push("TOKEN_USAGE_PARTIAL");
    }
    if (!last.model) {
      warningCodes.push("MODEL_UNAVAILABLE");
    }

    return {
      provider: "opencode" as const,
      startedAt,
      endedAt,
      durationMs: durationBetween(startedAt, endedAt),
      status,
      completionEvidence,
      model: last.model,
      tokens,
      warningCodes: uniqueWarnings(warningCodes),
    };
  });
}

export async function parseOpenCodeSqlite(
  bytes: Uint8Array,
): Promise<ParsedSource> {
  if (!isSqliteBytes(bytes)) {
    throw new Error("Unsupported SQLite source");
  }

  const sqlite3 = await prepareOpenCodeParser();
  const opened = openReadonlyDatabase(sqlite3, bytes);
  const { db } = opened;

  try {
    const tables = listTables(db);
    const legacyColumns = tables.has("message")
      ? tableColumns(db, "message")
      : new Set<string>();
    const v2Columns = tables.has("session_message")
      ? tableColumns(db, "session_message")
      : new Set<string>();
    const hasLegacy = ["id", "session_id", "time_created", "data"].every(
      (column) => legacyColumns.has(column),
    );
    const hasV2 = [
      "id",
      "session_id",
      "type",
      "time_created",
      "data",
    ].every((column) => v2Columns.has(column));

    if (!hasLegacy && !hasV2) {
      throw new Error("Unsupported OpenCode schema");
    }

    const v2 = hasV2
      ? parseV2Rows(db, v2Columns.has("seq"))
      : {
          groups: [],
          malformedRecords: 0,
          ignoredRecords: 0,
        };
    const legacy = hasLegacy
      ? parseLegacyRows(db)
      : {
          groups: [],
          malformedRecords: 0,
          ignoredRecords: 0,
        };
    const v2GroupKeys = new Set(
      v2.groups.map((group) => `${group.sessionId}\0${group.groupId}`),
    );
    const duplicateLegacyGroups = legacy.groups.filter((group) =>
      v2GroupKeys.has(`${group.sessionId}\0${group.groupId}`),
    );
    const legacyOnlyGroups = legacy.groups.filter(
      (group) => !v2GroupKeys.has(`${group.sessionId}\0${group.groupId}`),
    );
    const runs = normalizeGroups([...v2.groups, ...legacyOnlyGroups]);
    const warningCodes: WarningCode[] = [];
    const malformedRecords =
      v2.malformedRecords + legacy.malformedRecords;
    if (malformedRecords > 0) {
      warningCodes.push("MALFORMED_RECORDS_SKIPPED");
    }
    if (opened.wasWal) {
      warningCodes.push("WAL_SNAPSHOT_MAY_BE_STALE");
    }
    if (runs.length === 0) {
      warningCodes.push("NO_VALID_RUNS");
    }

    return {
      provider: "opencode",
      runs,
      malformedRecords,
      oversizedRecords: 0,
      ignoredRecords:
        v2.ignoredRecords +
        legacy.ignoredRecords +
        duplicateLegacyGroups.reduce(
          (count, group) => count + group.assistants.length + 1,
          0,
        ),
      warningCodes,
    };
  } finally {
    db.close();
  }
}
