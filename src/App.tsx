import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Results } from "./components/Results";
import { serializeMetadataExport } from "./core/export";
import type {
  AnalysisResult,
  WorkerRequest,
  WorkerResponse,
} from "./core/types";

const ERROR_MESSAGES: Record<
  Extract<WorkerResponse, { type: "error" }>["code"],
  string
> = {
  NO_FILES: "Choose at least one session source.",
  TOO_MANY_FILES: "Choose no more than 100 sources at once.",
  FILE_TOO_LARGE:
    "The selection exceeds the documented browser memory limit.",
  UNSUPPORTED_FILE:
    "No supported Codex, Claude Code, or OpenCode source was detected.",
  ANALYSIS_FAILED:
    "The analysis could not be completed. The source contents were not retained.",
};

function AppMark() {
  return (
    <span className="app-mark" aria-label="Turnspan">
      <span className="app-mark__word">Turnspan</span>
      <span className="app-mark__line" aria-hidden="true" />
    </span>
  );
}

export function App() {
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusInputWhenReadyRef = useRef(false);
  const [workerGeneration, setWorkerGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReady(false);
    const worker = new Worker(
      new URL("./workers/analyzer.worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    worker.addEventListener(
      "message",
      (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (message.type === "ready") {
          setReady(true);
          return;
        }
        if (message.type === "progress") {
          setProgress({
            completed: message.completed,
            total: message.total,
          });
          return;
        }
        if (message.type === "result") {
          setResult(message.result);
          setAnalyzing(false);
          setError(null);
          if (inputRef.current) {
            inputRef.current.value = "";
          }
          if (workerRef.current === worker) {
            workerRef.current = null;
            worker.terminate();
            setReady(false);
          }
          return;
        }
        setError(ERROR_MESSAGES[message.code]);
        setAnalyzing(false);
      },
    );

    return () => {
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, [workerGeneration]);

  useEffect(() => {
    if (!ready || result || !focusInputWhenReadyRef.current) {
      return;
    }
    focusInputWhenReadyRef.current = false;
    inputRef.current?.focus();
  }, [ready, result]);

  const resetWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setReady(false);
    setWorkerGeneration((generation) => generation + 1);
  }, []);

  const clear = useCallback(() => {
    focusInputWhenReadyRef.current = true;
    resetWorker();
    setAnalyzing(false);
    setProgress({ completed: 0, total: 0 });
    setResult(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [resetWorker]);

  const analyzeFiles = useCallback(
    (files: File[]) => {
      if (!ready || files.length === 0 || !workerRef.current) {
        return;
      }

      setAnalyzing(true);
      setResult(null);
      setError(null);
      setProgress({ completed: 0, total: files.length });
      const message: WorkerRequest = { type: "analyze", files };
      workerRef.current.postMessage(message);
    },
    [ready],
  );

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    analyzeFiles(files);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!analyzing) {
      analyzeFiles(Array.from(event.dataTransfer.files));
    }
  };

  const cancel = () => {
    const message: WorkerRequest = { type: "cancel" };
    workerRef.current?.postMessage(message);
    focusInputWhenReadyRef.current = true;
    resetWorker();
    setAnalyzing(false);
    setProgress({ completed: 0, total: 0 });
    setError(null);
  };

  const download = () => {
    if (!result) return;
    const blob = new Blob([serializeMetadataExport(result)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "turnspan-metadata.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const statusMessage = analyzing
    ? `Analyzing source ${Math.min(
        progress.completed + 1,
        progress.total,
      )} of ${progress.total}…`
    : result
      ? "Analysis complete. Clear the result to analyze another selection."
      : ready
        ? "Parser ready. Files stay in this tab."
        : "Preparing the local parser…";

  return (
    <>
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Turnspan home">
          <span>TEAM ATTENTION</span>
          <span aria-hidden="true">×</span>
          <span>RALPHTHON</span>
        </a>
        <span className="local-badge">
          <i aria-hidden="true" />
          <span className="local-badge__long">
            Local only <span>·</span> zero uploads
          </span>
          <span className="local-badge__short" aria-hidden="true">
            Local only
          </span>
        </span>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <p className="hero__kicker">Session runtime instrument / 2026</p>
          <h1 id="hero-title">
            <AppMark />
          </h1>
          <div className="hero__intro">
            <p>Measure the run, not the conversation.</p>
            <p>
              Find the longest completed, uninterrupted turn across Codex,
              Claude Code, and OpenCode—without exposing what anyone wrote.
            </p>
          </div>
        </section>

        <section className="import-section" aria-labelledby="import-title">
          <div className="section-heading">
            <p className="eyebrow">Input / Local</p>
            <div>
              <h2 id="import-title">Bring session files to the browser.</h2>
              <p>
                Codex JSONL · Claude Code JSONL · OpenCode export JSON / SQLite
              </p>
            </div>
          </div>

          <div
            className={`dropzone${dragging ? " dropzone--active" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!analyzing) setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDrop={handleDrop}
            data-ready={ready ? "true" : "false"}
          >
            <input
              ref={inputRef}
              id="session-files"
              type="file"
              multiple
              accept=".jsonl,.json,.sqlite,.db,application/x-sqlite3,application/json"
              onChange={handleInput}
              disabled={!ready || analyzing}
            />
            <div className="dropzone__index" aria-hidden="true">
              01
            </div>
            <div className="dropzone__copy">
              <strong>
                {dragging ? "Drop to analyze" : "Choose session files"}
              </strong>
              <span>or drop files anywhere inside this field</span>
            </div>
            <label
              className={`button button--accent${!ready || analyzing ? " is-disabled" : ""}`}
              htmlFor="session-files"
              aria-disabled={!ready || analyzing}
            >
              Select files
            </label>
          </div>

          <div className="privacy-rule">
            <p>
              <strong>Private by construction.</strong> Source contents are
              parsed in this tab and are not uploaded or persisted. Metadata is
              saved only when you choose Download. Prompts, responses, and tool
              output are never shown or exported.
            </p>
            <p className="mono">
              256 MiB/source · 512 MiB total · 100 sources
            </p>
          </div>

          <div
            className="analysis-status"
            role={error ? "alert" : "status"}
            aria-live="polite"
          >
            <span>{error ?? statusMessage}</span>
            {analyzing && (
              <button type="button" onClick={cancel}>
                Cancel
              </button>
            )}
            {!analyzing && result && (
              <a href="#results">Jump to results ↓</a>
            )}
          </div>
        </section>

        {result && (
          <Results
            result={result}
            onDownload={download}
            onClear={clear}
          />
        )}

        <section className="method" aria-labelledby="method-title">
          <div className="section-heading">
            <p className="eyebrow">Method / Scope</p>
            <div>
              <h2 id="method-title">Metadata in. Metadata out.</h2>
              <p>
                Provider-specific adapters emit only timestamp, completion,
                token, and model fields. Missing evidence stays unavailable.
              </p>
            </div>
          </div>
          <div className="method-grid">
            <div>
              <span>01</span>
              <h3>Detect</h3>
              <p>Magic bytes and known record shapes, never a filename guess.</p>
            </div>
            <div>
              <span>02</span>
              <h3>Normalize</h3>
              <p>Raw records remain behind the Worker boundary.</p>
            </div>
            <div>
              <span>03</span>
              <h3>Prove</h3>
              <p>Only explicit clean terminal evidence qualifies for longest.</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <AppMark />
        <div>
          <p>A Team Attention × Ralphthon utility.</p>
          <p>
            Independent and unaffiliated with OpenAI, Anthropic, or OpenCode.
          </p>
        </div>
        <a href="#top">Back to top ↑</a>
      </footer>
    </>
  );
}
