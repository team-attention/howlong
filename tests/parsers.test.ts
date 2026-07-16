import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { buildAnalysisResult } from "../src/core/analysis";
import {
  createMetadataExport,
  serializeMetadataExport,
} from "../src/core/export";
import { parseClaudeJsonl } from "../src/parsers/claude";
import { parseCodexJsonl } from "../src/parsers/codex";
import {
  detectJsonlProvider,
  parseJsonlText,
} from "../src/parsers/jsonl";
import { MAX_JSONL_LINE_BYTES } from "../src/parsers/limits";
import {
  parseOpenCodeExportJson,
  parseOpenCodeSqlite,
} from "../src/parsers/opencode";
import type { ParsedSource, Provider } from "../src/core/types";

const fixture = (name: string) =>
  new URL(`./fixtures/${name}`, import.meta.url);
const textFixture = (name: string) => readFileSync(fixture(name), "utf8");
const PRIVATE_CANARY = "TURNSPAN_PRIVATE_CANARY_7f3b";

describe("Codex JSONL", () => {
  it("extracts completed and interrupted runs with cumulative token deltas", () => {
    const parsed = parseCodexJsonl(textFixture("codex-stable.jsonl"));

    expect(parsed.provider).toBe("codex");
    expect(parsed.malformedRecords).toBe(1);
    expect(parsed.runs).toHaveLength(2);
    expect(parsed.runs[0]).toMatchObject({
      status: "completed",
      durationMs: 60_000,
      model: "gpt-5.4-codex",
      tokens: { total: 1_000 },
    });
    expect(parsed.runs[1]).toMatchObject({
      status: "interrupted",
      durationMs: 30_000,
      model: "gpt-5.4-mini",
      tokens: { total: 600, cacheWrite: 30 },
    });
  });

  it("does not promote a forward-schema terminal event carrying an error", () => {
    const parsed = parseCodexJsonl(
      [
        JSON.stringify({
          timestamp: "2026-04-01T00:00:00.000Z",
          type: "event_msg",
          payload: {
            type: "task_started",
            turn_id: "error-turn",
            started_at: 1775001600000,
          },
        }),
        JSON.stringify({
          timestamp: "2026-04-01T00:00:05.000Z",
          type: "event_msg",
          payload: {
            type: "task_complete",
            turn_id: "error-turn",
            completed_at: 1775001605000,
            duration_ms: 5_000,
            error: { name: "SyntheticError", message: PRIVATE_CANARY },
          },
        }),
      ].join("\n"),
    );

    expect(parsed.runs[0]).toMatchObject({
      status: "incomplete",
      completionEvidence: "terminal-error",
    });
  });

  it("keeps tokens unavailable when a turn has no fresh cumulative snapshot", () => {
    const parsed = parseCodexJsonl(
      [
        JSON.stringify({
          timestamp: "2026-04-01T00:00:00.000Z",
          type: "event_msg",
          payload: { type: "task_started", turn_id: "first" },
        }),
        JSON.stringify({
          timestamp: "2026-04-01T00:00:01.000Z",
          type: "event_msg",
          payload: {
            type: "token_count",
            info: { total_token_usage: { total_tokens: 100 } },
          },
        }),
        JSON.stringify({
          timestamp: "2026-04-01T00:00:02.000Z",
          type: "event_msg",
          payload: { type: "task_complete", turn_id: "first" },
        }),
        JSON.stringify({
          timestamp: "2026-04-01T00:01:00.000Z",
          type: "event_msg",
          payload: { type: "task_started", turn_id: "second" },
        }),
        JSON.stringify({
          timestamp: "2026-04-01T00:01:05.000Z",
          type: "event_msg",
          payload: { type: "task_complete", turn_id: "second" },
        }),
      ].join("\n"),
    );

    expect(parsed.runs[0].tokens.total).toBe(100);
    expect(parsed.runs[1]).toMatchObject({
      tokens: {},
      warningCodes: expect.arrayContaining(["TOKEN_USAGE_PARTIAL"]),
    });
  });

  it("accepts official Unix-second turn timestamps", () => {
    const parsed = parseCodexJsonl(
      [
        JSON.stringify({
          timestamp: "2026-04-01T00:00:00.000Z",
          type: "event_msg",
          payload: {
            type: "task_started",
            turn_id: "seconds-turn",
            started_at: 1_775_001_600,
          },
        }),
        JSON.stringify({
          timestamp: "2026-04-01T00:00:05.000Z",
          type: "event_msg",
          payload: {
            type: "task_complete",
            turn_id: "seconds-turn",
            completed_at: 1_775_001_605,
          },
        }),
      ].join("\n"),
    );

    expect(parsed.runs[0]).toMatchObject({
      startedAt: "2026-04-01T00:00:00.000Z",
      endedAt: "2026-04-01T00:00:05.000Z",
      durationMs: 5_000,
    });
  });
});

describe("Claude Code JSONL", () => {
  it("keeps tool results inside a turn, deduplicates usage, and retains sidechains", () => {
    const parsed = parseClaudeJsonl(textFixture("claude-current.jsonl"));

    expect(parsed.runs).toHaveLength(5);
    expect(parsed.runs[0]).toMatchObject({
      status: "completed",
      durationMs: 90_000,
      model: "claude-opus-4-1",
      tokens: { total: 245 },
    });
    expect(parsed.runs[1].completionEvidence).toBe("terminal-error");
    expect(parsed.runs[2].status).toBe("interrupted");
    expect(parsed.runs[3]).toMatchObject({
      status: "completed",
      durationMs: 20_000,
      model: "claude-haiku-4-1",
    });
    expect(parsed.runs[4]).toMatchObject({
      status: "incomplete",
      warningCodes: ["BACKGROUND_WORK_PENDING"],
    });
  });

  it("does not promote a max-token turn even when duration is recorded", () => {
    const parsed = parseClaudeJsonl(
      [
        JSON.stringify({
          type: "user",
          uuid: "user-max",
          sessionId: "sanitized",
          timestamp: "2026-04-02T06:00:00.000Z",
          message: { role: "user", content: "private" },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "assistant-max",
          requestId: "request-max",
          sessionId: "sanitized",
          timestamp: "2026-04-02T06:00:30.000Z",
          message: {
            id: "message-max",
            role: "assistant",
            model: "claude-opus-4-1",
            stop_reason: "max_tokens",
            content: [{ type: "text", text: PRIVATE_CANARY }],
            usage: { input_tokens: 10, output_tokens: 20 },
          },
        }),
        JSON.stringify({
          type: "system",
          subtype: "turn_duration",
          uuid: "duration-max",
          sessionId: "sanitized",
          timestamp: "2026-04-02T06:00:30.000Z",
          durationMs: 30_000,
        }),
      ].join("\n"),
    );

    expect(parsed.runs[0]).toMatchObject({
      status: "incomplete",
      completionEvidence: "non-clean-terminal",
      durationMs: 30_000,
    });
  });

  it("excludes system task notifications and their cumulative duration bundle", () => {
    const parsed = parseClaudeJsonl(
      textFixture("claude-task-notification.jsonl"),
    );
    const result = buildAnalysisResult([parsed]);
    const serialized = JSON.stringify(result);

    expect(parsed.runs).toHaveLength(2);
    expect(parsed.runs[0]).toMatchObject({
      startedAt: "2026-04-05T00:00:00.000Z",
      endedAt: "2026-04-05T00:00:10.000Z",
      durationMs: 10_000,
      status: "completed",
      completionEvidence: "terminal-stop",
    });
    expect(parsed.runs[1]).toMatchObject({
      durationMs: 703_073,
      status: "completed",
      completionEvidence: "explicit-duration",
    });
    expect(parsed.runs.some((run) => run.durationMs === 3_605_000)).toBe(
      false,
    );
    expect(result.longestCompletedRunId).toBe("claude-002");
    expect(serialized).not.toContain(PRIVATE_CANARY);
  });

  it("deduplicates message usage by message ID and scans every tool-result block", () => {
    const parsed = parseClaudeJsonl(
      [
        JSON.stringify({
          type: "user",
          uuid: "user-dedupe",
          sessionId: "sanitized",
          timestamp: "2026-04-02T07:00:00.000Z",
          message: { role: "user", content: PRIVATE_CANARY },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "assistant-dedupe-a",
          requestId: "request-a",
          sessionId: "sanitized",
          timestamp: "2026-04-02T07:00:10.000Z",
          message: {
            id: "message-shared",
            role: "assistant",
            model: "claude-opus-4-1",
            stop_reason: "tool_use",
            usage: { input_tokens: 100, output_tokens: 40 },
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "assistant-dedupe-b",
          requestId: "request-b",
          sessionId: "sanitized",
          timestamp: "2026-04-02T07:00:11.000Z",
          message: {
            id: "message-shared",
            role: "assistant",
            model: "claude-opus-4-1",
            stop_reason: "tool_use",
            usage: {
              input_tokens: 80,
              output_tokens: 50,
              cache_read_input_tokens: 30,
            },
          },
        }),
        JSON.stringify({
          type: "user",
          uuid: "tool-result-later-block",
          sessionId: "sanitized",
          timestamp: "2026-04-02T07:00:20.000Z",
          message: {
            role: "user",
            content: [
              { type: "text", text: "synthetic wrapper" },
              { type: "tool_result", content: PRIVATE_CANARY },
            ],
          },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "assistant-final",
          requestId: "request-final",
          sessionId: "sanitized",
          timestamp: "2026-04-02T07:01:00.000Z",
          message: {
            id: "message-final",
            role: "assistant",
            model: "claude-opus-4-1",
            stop_reason: "end_turn",
            usage: { input_tokens: 20, output_tokens: 10 },
          },
        }),
        JSON.stringify({
          type: "system",
          subtype: "turn_duration",
          sessionId: "sanitized",
          timestamp: "2026-04-02T07:01:00.000Z",
          durationMs: 60_000,
        }),
      ].join("\n"),
    );

    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0]).toMatchObject({
      status: "completed",
      tokens: {
        input: 120,
        output: 60,
        cacheRead: 30,
        total: 210,
      },
    });
  });

  it("ignores an interruption marker that targets another assistant message", () => {
    const parsed = parseClaudeJsonl(
      [
        JSON.stringify({
          type: "user",
          uuid: "user-current",
          sessionId: "sanitized",
          timestamp: "2026-04-02T08:00:00.000Z",
          message: { role: "user", content: PRIVATE_CANARY },
        }),
        JSON.stringify({
          type: "assistant",
          uuid: "assistant-current",
          sessionId: "sanitized",
          timestamp: "2026-04-02T08:00:10.000Z",
          message: {
            id: "message-current",
            role: "assistant",
            model: "claude-opus-4-1",
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 5 },
          },
        }),
        JSON.stringify({
          type: "user",
          uuid: "stale-interrupt",
          sessionId: "sanitized",
          timestamp: "2026-04-02T08:00:11.000Z",
          interruptedMessageId: "message-from-another-turn",
          message: { role: "user", content: PRIVATE_CANARY },
        }),
        JSON.stringify({
          type: "system",
          subtype: "turn_duration",
          sessionId: "sanitized",
          timestamp: "2026-04-02T08:00:15.000Z",
          durationMs: 15_000,
        }),
      ].join("\n"),
    );

    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0]).toMatchObject({
      status: "completed",
      completionEvidence: "explicit-duration",
    });
  });
});

describe("OpenCode SQLite", () => {
  it("reads checkpointed WAL-header legacy and v2 schemas in-browser format", async () => {
    const bytes = new Uint8Array(
      readFileSync(fixture("opencode-latest.sqlite")),
    );
    expect(bytes[18]).toBe(2);
    expect(bytes[19]).toBe(2);

    const parsed = await parseOpenCodeSqlite(bytes);
    expect(parsed.warningCodes).toContain("WAL_SNAPSHOT_MAY_BE_STALE");
    expect(parsed.runs).toHaveLength(3);
    expect(parsed.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "completed",
          durationMs: 120_000,
          model: "openai/gpt-5.4",
          tokens: expect.objectContaining({ total: 1_500 }),
        }),
        expect.objectContaining({
          status: "interrupted",
          model: "openai/gpt-5.4",
        }),
        expect.objectContaining({
          status: "completed",
          durationMs: 180_000,
          model: "anthropic/claude-opus-4-1",
          tokens: expect.objectContaining({ total: 280 }),
        }),
      ]),
    );
  });

  it("supports pre-sequence V2 tables and deduplicates mixed migrations by turn", async () => {
    const parsed = await parseOpenCodeSqlite(
      new Uint8Array(
        readFileSync(fixture("opencode-transitional.sqlite")),
      ),
    );

    expect(parsed.runs).toHaveLength(3);
    expect(parsed.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "completed",
          durationMs: 60_000,
          model: "openai/gpt-5.4",
          tokens: expect.objectContaining({ total: 120 }),
        }),
        expect.objectContaining({
          status: "completed",
          durationMs: 60_000,
          model: "anthropic/claude-opus-4-1",
          tokens: expect.objectContaining({ total: 225 }),
        }),
        expect.objectContaining({
          status: "incomplete",
          completionEvidence: "non-clean-terminal",
          durationMs: 180_000,
          model: "openai/gpt-5.4",
        }),
      ]),
    );
    expect(JSON.stringify(parsed)).not.toContain("legacy-provider");
    expect(JSON.stringify(parsed)).not.toContain(PRIVATE_CANARY);
  });

  it("fails closed for malformed SQLite images without returning source bytes", async () => {
    const malformed = new Uint8Array(512);
    malformed.set(new TextEncoder().encode("SQLite format 3\0"));
    malformed[18] = 1;
    malformed[19] = 1;

    await expect(parseOpenCodeSqlite(malformed)).rejects.toThrow(
      /SQLite source|SQLite snapshot/,
    );
  });
});

describe("OpenCode export JSON", () => {
  it("reads the official export shape through a strict metadata allowlist", () => {
    const parsed = parseOpenCodeExportJson(
      textFixture("opencode-export.json"),
    );

    expect(parsed?.runs).toHaveLength(2);
    expect(parsed?.runs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          status: "completed",
          durationMs: 100_000,
          model: "openai/gpt-5.4",
          tokens: expect.objectContaining({ total: 330 }),
        }),
        expect.objectContaining({
          status: "interrupted",
          model: "anthropic/claude-opus-4-1",
        }),
      ]),
    );
    expect(JSON.stringify(parsed)).not.toContain(PRIVATE_CANARY);
  });

  it("rejects unrelated JSON", () => {
    expect(
      parseOpenCodeExportJson('{"messages":[],"private":"source"}'),
    ).toBeUndefined();
  });

  it("ignores private metadata fallbacks and orphan assistant parents", () => {
    const parsed = parseOpenCodeExportJson(
      JSON.stringify({
        info: { id: "ses_metadata_guard" },
        messages: [
          {
            info: {
              id: "user-before-orphan",
              role: "user",
              time: { created: 1_775_260_800_000 },
            },
            parts: [],
          },
          {
            info: {
              id: "orphan-assistant",
              parentID: "missing-user",
              role: "assistant",
              time: {
                created: 1_775_260_801_000,
                completed: 1_775_260_802_000,
              },
              providerID: "private",
              modelID: PRIVATE_CANARY,
              finish: "stop",
              tokens: { input: 999, output: 999 },
            },
            parts: [],
          },
          {
            info: {
              id: "valid-user",
              role: "user",
              time: { created: 1_775_260_810_000 },
            },
            parts: [],
          },
          {
            info: {
              id: "valid-assistant",
              parentID: "valid-user",
              role: "assistant",
              time: {
                created: 1_775_260_811_000,
                completed: 1_775_260_820_000,
              },
              finish: "stop",
              tokens: { input: 10, output: 5 },
              metadata: {
                assistant: {
                  providerID: "private",
                  modelID: PRIVATE_CANARY,
                },
                error: { message: PRIVATE_CANARY },
              },
            },
            parts: [{ type: "text", text: PRIVATE_CANARY }],
          },
        ],
      }),
    );

    expect(parsed?.runs).toHaveLength(1);
    expect(parsed?.runs[0]).toMatchObject({
      status: "completed",
      model: undefined,
      tokens: { total: 15 },
      warningCodes: expect.arrayContaining(["MODEL_UNAVAILABLE"]),
    });
    expect(JSON.stringify(parsed)).not.toContain(PRIVATE_CANARY);
  });
});

describe("bounded JSONL detection", () => {
  it("skips an oversized line before JSON.parse and still detects a later source row", () => {
    const oversized = "x".repeat(MAX_JSONL_LINE_BYTES + 1);
    const valid = JSON.stringify({
      type: "event_msg",
      payload: { type: "task_started" },
    });
    const parseSpy = vi.spyOn(JSON, "parse");

    try {
      expect(detectJsonlProvider(`${oversized}\n${valid}`)).toBe("codex");
      expect(
        parseSpy.mock.calls.some(
          ([value]) =>
            typeof value === "string" &&
            value.length > MAX_JSONL_LINE_BYTES,
        ),
      ).toBe(false);
      expect(
        parseJsonlText(`${oversized}\n${valid}`)?.oversizedRecords,
      ).toBe(1);
    } finally {
      parseSpy.mockRestore();
    }
  });

  it("counts malformed lines toward the bounded detection window", () => {
    const malformed = Array.from({ length: 80 }, () => "{").join("\n");
    const valid = JSON.stringify({
      type: "event_msg",
      payload: { type: "task_started" },
    });
    expect(detectJsonlProvider(`${malformed}\n${valid}`)).toBeUndefined();
  });
});

describe("analysis determinism", () => {
  const source = (provider: Provider): ParsedSource => ({
    provider,
    malformedRecords: 0,
    oversizedRecords: 0,
    ignoredRecords: 0,
    warningCodes: [],
    runs: [
      {
        provider,
        startedAt: "2026-04-03T00:00:00.000Z",
        endedAt: "2026-04-03T00:01:00.000Z",
        durationMs: 60_000,
        status: "completed",
        completionEvidence: "explicit-complete",
        model: "synthetic-model",
        tokens: { total: 1 },
        warningCodes: [],
      },
    ],
  });

  it("uses run ID as the final longest-run tie breaker", () => {
    const result = buildAnalysisResult([
      source("codex"),
      source("claude"),
    ]);
    expect(result.longestCompletedRunId).toBe("claude-001");
  });
});

describe("privacy boundary", () => {
  it("never carries prompt, response, or tool-output canaries into results or export", async () => {
    const sources = [
      parseCodexJsonl(textFixture("codex-stable.jsonl")),
      parseClaudeJsonl(textFixture("claude-current.jsonl")),
      await parseOpenCodeSqlite(
        new Uint8Array(readFileSync(fixture("opencode-latest.sqlite"))),
      ),
      parseOpenCodeExportJson(textFixture("opencode-export.json")),
    ];
    const result = buildAnalysisResult(sources);
    const serializedResult = JSON.stringify(result);
    const serializedExport = serializeMetadataExport(result);
    const metadataExport = createMetadataExport(result);

    expect(serializedResult).not.toContain(PRIVATE_CANARY);
    expect(serializedExport).not.toContain(PRIVATE_CANARY);
    expect(Object.keys(metadataExport)).toEqual([
      "schemaVersion",
      "product",
      "summary",
      "sources",
      "runs",
    ]);
    expect(Object.keys(metadataExport.summary)).toEqual([
      "sources",
      "runs",
      "completed",
      "interrupted",
      "incomplete",
      "tokens",
      "longestCompletedRunId",
    ]);
    for (const source of metadataExport.sources) {
      expect(Object.keys(source)).toEqual([
        "sourceOrdinal",
        "provider",
        "runCount",
        "skippedRecords",
        "warningCodes",
      ]);
    }
    for (const run of metadataExport.runs) {
      expect(Object.keys(run)).toEqual([
        "id",
        "provider",
        "sourceOrdinal",
        "turnOrdinal",
        "startedAt",
        "endedAt",
        "durationMs",
        "completionStatus",
        "completionEvidence",
        "inputTokens",
        "outputTokens",
        "cacheReadTokens",
        "cacheWriteTokens",
        "reasoningTokens",
        "totalTokens",
        "model",
        "warningCodes",
      ]);
    }
  });
});
