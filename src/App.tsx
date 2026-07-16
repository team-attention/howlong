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

const GITHUB_URL = "https://github.com/team-attention/howlong";

type WorkerErrorCode = Extract<
  WorkerResponse,
  { type: "error" }
>["code"];
type AppError = WorkerErrorCode | "NO_VALID_SESSIONS" | "REPLACEMENT_FAILED";

const ERROR_MESSAGES: Record<AppError, string> = {
  NO_FILES: "Choose at least one session file.",
  TOO_MANY_FILES: "Choose no more than 100 files at once.",
  FILE_TOO_LARGE: "The selection exceeds the browser memory limit.",
  UNSUPPORTED_FILE:
    "No supported Codex, Claude Code, or OpenCode session was detected.",
  ANALYSIS_FAILED: "The analysis could not be completed.",
  NO_VALID_SESSIONS: "No valid sessions were found in those files.",
  REPLACEMENT_FAILED:
    "Couldn’t analyze those files. Previous results are unchanged.",
};

export function App() {
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<AnalysisResult | null>(null);
  const focusInputWhenReadyRef = useRef(false);
  const navigateAfterResultRef = useRef(false);
  const [workerGeneration, setWorkerGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    document.documentElement.lang = "en";
  }, []);

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
          const previousResult = resultRef.current;
          if (message.result.totals.runs === 0) {
            setError(
              previousResult
                ? "REPLACEMENT_FAILED"
                : "NO_VALID_SESSIONS",
            );
            setAnalyzing(false);
            return;
          }
          resultRef.current = message.result;
          setResult(message.result);
          setAnalyzing(false);
          setError(null);
          if (inputRef.current) {
            inputRef.current.value = "";
          }
          navigateAfterResultRef.current = !previousResult;
          return;
        }
        setError(
          resultRef.current ? "REPLACEMENT_FAILED" : message.code,
        );
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
    if (!result || !navigateAfterResultRef.current) {
      return;
    }
    navigateAfterResultRef.current = false;
    window.requestAnimationFrame(() => {
      const results = document.getElementById("results");
      const title = document.getElementById("results-title");
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      results?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
      title?.focus({ preventScroll: true });
    });
  }, [result]);

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

  const analyzeFiles = useCallback(
    (files: File[]) => {
      if (!ready || files.length === 0 || !workerRef.current) {
        return;
      }

      setAnalyzing(true);
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

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!analyzing) {
      analyzeFiles(Array.from(event.dataTransfer.files));
    }
  };

  const chooseDifferentFiles = () => {
    if (ready && !analyzing) {
      inputRef.current?.click();
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
    anchor.download = "howlong-metadata.json";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const progressMessage = `Analyzing ${Math.min(
    progress.completed + 1,
    progress.total,
  )} of ${progress.total}…`;
  const showUploadStatus = !ready || (!result && (analyzing || error));

  return (
    <>
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label="Howlong home">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
          </span>
          <strong>Howlong</strong>
          <span>by Team Attention</span>
        </a>
        <a
          className="github-link"
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main id="top">
        <input
          ref={inputRef}
          id="session-files"
          className="file-input"
          type="file"
          multiple
          accept=".jsonl,.json,.sqlite,.db,application/x-sqlite3,application/json"
          aria-label="Choose session files"
          onChange={handleInput}
          disabled={!ready || analyzing}
        />

        {!result && (
          <section
            id="upload"
            className="upload"
            aria-labelledby="upload-title"
          >
            <div className="upload-copy">
              <h1 id="upload-title">How long did it really run?</h1>
              <p>Analyze Codex, Claude Code, and OpenCode sessions locally.</p>
            </div>

            <label
              className={`dropzone${dragging ? " dropzone--active" : ""}${
                !ready || analyzing ? " dropzone--disabled" : ""
              }`}
              htmlFor="session-files"
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
              <span className="dropzone__icon" aria-hidden="true">
                ↓
              </span>
              <strong>{dragging ? "Drop to analyze" : "Drop session files"}</strong>
              <span>
                {dragging
                  ? "Release anywhere in this area"
                  : "or choose files · JSONL · JSON · SQLite"}
              </span>
            </label>

            {showUploadStatus && (
              <div
                className={`analysis-status${
                  error ? " analysis-status--error" : ""
                }`}
                role={error ? "alert" : "status"}
                aria-live="polite"
                aria-atomic="true"
              >
                <span>
                  {error
                    ? ERROR_MESSAGES[error]
                    : analyzing
                      ? progressMessage
                      : "Preparing local analysis…"}
                </span>
                {analyzing && (
                  <button type="button" onClick={cancel}>
                    Cancel
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {result && (
          <Results
            result={result}
            onDownload={download}
            onChooseFiles={chooseDifferentFiles}
            canChooseFiles={ready && !analyzing}
            analyzing={analyzing}
            updateError={error ? ERROR_MESSAGES[error] : undefined}
            updateStatus={analyzing ? progressMessage : undefined}
            onCancel={cancel}
          />
        )}
      </main>

      <footer>
        <span>Team Attention × Ralphthon</span>
        <nav aria-label="Project links">
          <a href={`${GITHUB_URL}/blob/main/docs/privacy.md`}>Privacy</a>
          <a href={GITHUB_URL}>GitHub ↗</a>
        </nav>
      </footer>
    </>
  );
}
