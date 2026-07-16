/// <reference lib="webworker" />

import { buildAnalysisResult } from "../core/analysis";
import type {
  ParsedSource,
  WorkerRequest,
  WorkerResponse,
} from "../core/types";
import { parseJsonlText } from "../parsers/jsonl";
import {
  isSqliteBytes,
  parseOpenCodeExportJson,
  parseOpenCodeSqlite,
  prepareOpenCodeParser,
} from "../parsers/opencode";

const MAX_FILES = 100;
const MAX_FILE_BYTES = 256 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const MAX_RUNS_PER_SOURCE = 10_000;
const MAX_TOTAL_RUNS = 50_000;

const worker = self as DedicatedWorkerGlobalScope;
let cancelled = false;

function send(message: WorkerResponse) {
  worker.postMessage(message);
}

async function parseFile(file: File): Promise<ParsedSource | undefined> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (isSqliteBytes(header)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return parseOpenCodeSqlite(bytes);
  }

  const text = await file.text();
  return parseJsonlText(text) ?? parseOpenCodeExportJson(text);
}

function boundRuns(
  source: ParsedSource,
  remainingRuns: number,
): ParsedSource {
  const allowed = Math.min(MAX_RUNS_PER_SOURCE, Math.max(remainingRuns, 0));
  if (source.runs.length <= allowed) {
    return source;
  }

  return {
    ...source,
    runs: source.runs.slice(0, allowed),
    ignoredRecords: source.ignoredRecords + source.runs.length - allowed,
    warningCodes: source.warningCodes.includes("RUN_LIMIT_REACHED")
      ? source.warningCodes
      : [...source.warningCodes, "RUN_LIMIT_REACHED"],
  };
}

function lockWorkerNetwork() {
  const blockedConstructor = function NetworkAccessDisabled() {
    throw new TypeError("Network access is disabled after parser setup");
  };
  const definitions: Record<string, unknown> = {
    fetch: () =>
      Promise.reject(
        new TypeError("Network access is disabled after parser setup"),
      ),
    WebSocket: blockedConstructor,
    EventSource: blockedConstructor,
    XMLHttpRequest: blockedConstructor,
    importScripts: blockedConstructor,
  };

  for (const [name, value] of Object.entries(definitions)) {
    try {
      Object.defineProperty(worker, name, {
        configurable: false,
        enumerable: false,
        value,
        writable: false,
      });
    } catch {
      // A missing or non-configurable API is already unavailable to the Worker.
    }
  }
}

async function analyze(files: File[]) {
  if (files.length === 0) {
    send({ type: "error", code: "NO_FILES" });
    return;
  }
  if (files.length > MAX_FILES) {
    send({ type: "error", code: "TOO_MANY_FILES" });
    return;
  }
  if (files.some((file) => file.size > MAX_FILE_BYTES)) {
    send({ type: "error", code: "FILE_TOO_LARGE" });
    return;
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    send({ type: "error", code: "FILE_TOO_LARGE" });
    return;
  }

  cancelled = false;
  const sources: Array<ParsedSource | undefined> = [];
  let acceptedRuns = 0;
  for (const [index, file] of files.entries()) {
    if (cancelled) {
      return;
    }

    try {
      const parsed = await parseFile(file);
      if (parsed) {
        const bounded = boundRuns(parsed, MAX_TOTAL_RUNS - acceptedRuns);
        acceptedRuns += bounded.runs.length;
        sources.push(bounded);
      } else {
        sources.push(undefined);
      }
    } catch {
      sources.push(undefined);
    }
    send({ type: "progress", completed: index + 1, total: files.length });
  }

  if (!cancelled) {
    send({ type: "result", result: buildAnalysisResult(sources) });
  }
}

worker.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  if (event.data.type === "cancel") {
    cancelled = true;
    return;
  }
  void analyze(event.data.files).catch(() => {
    send({ type: "error", code: "ANALYSIS_FAILED" });
  });
});

void prepareOpenCodeParser()
  .then(() => {
    lockWorkerNetwork();
    send({ type: "ready" });
  })
  .catch(() => send({ type: "error", code: "ANALYSIS_FAILED" }));
