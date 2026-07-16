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
  parseOpenCodeSqlite,
  prepareOpenCodeParser,
} from "../parsers/opencode";

const MAX_FILES = 100;
const MAX_FILE_BYTES = 512 * 1024 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024;

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
  return parseJsonlText(text);
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
  for (const [index, file] of files.entries()) {
    if (cancelled) {
      return;
    }

    try {
      sources.push(await parseFile(file));
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
  .then(() => send({ type: "ready" }))
  .catch(() => send({ type: "error", code: "ANALYSIS_FAILED" }));
