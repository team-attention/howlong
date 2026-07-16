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
import type { Locale } from "./core/format";
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

const COPY = {
  en: {
    home: "Howlong home",
    language: "Language",
    eyebrow: "Private session analysis",
    title: "Find your longest completed run.",
    subtitle:
      "Codex, Claude Code, and OpenCode — analyzed only in this browser.",
    drop: "Drop session files here",
    dropActive: "Drop to analyze",
    choose: "or click to choose · JSONL / JSON / SQLite",
    release: "Release anywhere inside this field",
    privacy: "Private by default. Nothing is uploaded or stored.",
    limits: "Up to 100 files · 256 MiB each",
    preparing: "Preparing the local parser…",
    analyzing: (completed: number, total: number) =>
      `Analyzing ${completed} of ${total}…`,
    cancel: "Cancel",
    footer: "A Team Attention × Ralphthon utility.",
    privacyLink: "Privacy",
    methodLink: "Method & limits",
    errors: {
      NO_FILES: "Choose at least one session source.",
      TOO_MANY_FILES: "Choose no more than 100 sources at once.",
      FILE_TOO_LARGE: "The selection exceeds the browser memory limit.",
      UNSUPPORTED_FILE:
        "No supported Codex, Claude Code, or OpenCode source was detected.",
      ANALYSIS_FAILED: "The analysis could not be completed.",
      NO_VALID_SESSIONS: "No valid sessions were found in those files.",
      REPLACEMENT_FAILED:
        "Couldn’t analyze those files. Previous results are unchanged.",
    },
  },
  ko: {
    home: "Howlong 홈",
    language: "언어",
    eyebrow: "비공개 세션 분석",
    title: "가장 오래 정상 완료된 실행을 찾아보세요.",
    subtitle:
      "Codex, Claude Code, OpenCode 세션을 이 브라우저 안에서만 분석합니다.",
    drop: "세션 파일을 여기에 놓으세요",
    dropActive: "놓아서 분석하기",
    choose: "또는 클릭해서 선택 · JSONL / JSON / SQLite",
    release: "이 영역 안에 파일을 놓으세요",
    privacy: "기본적으로 비공개입니다. 파일을 업로드하거나 저장하지 않습니다.",
    limits: "최대 100개 · 파일당 256 MiB",
    preparing: "로컬 분석기를 준비하고 있습니다…",
    analyzing: (completed: number, total: number) =>
      `${total}개 중 ${completed}개 분석 중…`,
    cancel: "취소",
    footer: "Team Attention × Ralphthon 프로젝트",
    privacyLink: "개인정보 보호",
    methodLink: "분석 기준과 한계",
    errors: {
      NO_FILES: "세션 파일을 하나 이상 선택하세요.",
      TOO_MANY_FILES: "한 번에 최대 100개까지 선택할 수 있습니다.",
      FILE_TOO_LARGE: "브라우저 메모리 제한을 초과했습니다.",
      UNSUPPORTED_FILE:
        "지원하는 Codex, Claude Code, OpenCode 파일을 찾지 못했습니다.",
      ANALYSIS_FAILED: "분석을 완료하지 못했습니다.",
      NO_VALID_SESSIONS: "유효한 세션을 찾지 못했습니다.",
      REPLACEMENT_FAILED:
        "파일을 분석하지 못했습니다. 이전 결과는 그대로 유지됩니다.",
    },
  },
} satisfies Record<
  Locale,
  {
    home: string;
    language: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    drop: string;
    dropActive: string;
    choose: string;
    release: string;
    privacy: string;
    limits: string;
    preparing: string;
    analyzing: (completed: number, total: number) => string;
    cancel: string;
    footer: string;
    privacyLink: string;
    methodLink: string;
    errors: Record<AppError, string>;
  }
>;

function getInitialLocale(): Locale {
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function App() {
  const workerRef = useRef<Worker | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<AnalysisResult | null>(null);
  const focusInputWhenReadyRef = useRef(false);
  const navigateToResultsRef = useRef(true);
  const navigateAfterResultRef = useRef(false);
  const [workerGeneration, setWorkerGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const copy = COPY[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

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
          navigateAfterResultRef.current =
            navigateToResultsRef.current || !previousResult;
          return;
        }
        setError(
          resultRef.current
            ? "REPLACEMENT_FAILED"
            : message.code,
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
      navigateToResultsRef.current = true;
      analyzeFiles(Array.from(event.dataTransfer.files));
    }
  };

  const chooseDifferentFiles = () => {
    if (!ready || analyzing) {
      document.getElementById("upload")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }
    navigateToResultsRef.current = false;
    inputRef.current?.click();
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

  const progressMessage = copy.analyzing(
    Math.min(progress.completed + 1, progress.total),
    progress.total,
  );
  const showUploadStatus = !ready || (!result && (analyzing || error));

  return (
    <>
      <header className="site-header">
        <a className="brand-lockup" href="#top" aria-label={copy.home}>
          <strong>Howlong</strong>
          <span>TEAM ATTENTION × RALPHTHON</span>
        </a>
        <div className="header-actions">
          <div
            className="language-switch"
            role="group"
            aria-label={`${COPY.en.language} / ${COPY.ko.language}`}
          >
            <button
              type="button"
              aria-pressed={locale === "ko"}
              onClick={() => setLocale("ko")}
            >
              KO
            </button>
            <button
              type="button"
              aria-pressed={locale === "en"}
              onClick={() => setLocale("en")}
            >
              EN
            </button>
          </div>
          <a
            className="github-link"
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <main id="top">
        <section
          id="upload"
          className={`import-section${
            result ? " import-section--with-results" : ""
          }`}
          aria-labelledby="upload-title"
        >
          <div className="upload-intro">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 id="upload-title">{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>

          <label
            className={`dropzone${dragging ? " dropzone--active" : ""}${
              !ready || analyzing ? " dropzone--disabled" : ""
            }`}
            htmlFor="session-files"
            onClick={(event) => {
              if (event.target !== inputRef.current) {
                navigateToResultsRef.current = true;
              }
            }}
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
              aria-labelledby="upload-title"
              aria-describedby="privacy-copy"
              onChange={handleInput}
              disabled={!ready || analyzing}
            />
            <div className="dropzone__copy">
              <strong id="drop-title">
                {dragging ? copy.dropActive : copy.drop}
              </strong>
              <span>
                {dragging ? copy.release : copy.choose}
              </span>
            </div>
            <span className="dropzone__arrow" aria-hidden="true">
              ↓
            </span>
          </label>

          <div className="privacy-rule">
            <p id="privacy-copy">
              <i aria-hidden="true" />
              <strong>{copy.privacy}</strong>
            </p>
            <p className="mono">{copy.limits}</p>
          </div>

          {showUploadStatus && (
            <div
              className="analysis-status"
              role={error ? "alert" : "status"}
              aria-live="polite"
              aria-atomic="true"
            >
              <span>
                {error
                  ? copy.errors[error]
                  : analyzing
                    ? progressMessage
                    : copy.preparing}
              </span>
              {analyzing && (
                <button type="button" onClick={cancel}>
                  {copy.cancel}
                </button>
              )}
            </div>
          )}
        </section>

        {result && (
          <Results
            result={result}
            locale={locale}
            onDownload={download}
            onChooseFiles={chooseDifferentFiles}
            canChooseFiles={ready && !analyzing}
            analyzing={analyzing}
            updateError={error ? copy.errors[error] : undefined}
            updateStatus={analyzing ? progressMessage : undefined}
            onCancel={cancel}
          />
        )}
      </main>

      <footer>
        <div>
          <strong>Howlong</strong>
          <span>{copy.footer}</span>
        </div>
        <nav aria-label="Project links">
          <a href={`${GITHUB_URL}/blob/main/docs/privacy.md`}>
            {copy.privacyLink}
          </a>
          <a href={`${GITHUB_URL}/blob/main/docs/support.md`}>
            {copy.methodLink}
          </a>
          <a href={GITHUB_URL}>GitHub ↗</a>
        </nav>
      </footer>
    </>
  );
}
