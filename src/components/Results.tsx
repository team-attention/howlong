import { useEffect, useMemo, useState } from "react";
import type { AnalysisResult, NormalizedRun } from "../core/types";
import {
  evidenceLabel,
  formatDuration,
  formatNumber,
  formatTimestamp,
  type Locale,
  providerLabel,
  statusLabel,
  unavailableLabel,
} from "../core/format";

const PAGE_SIZE = 50;

type SortKey = "duration" | "started" | "tokens" | "provider" | "status";
type SortDirection = "asc" | "desc";

interface ResultsProps {
  result: AnalysisResult;
  locale: Locale;
  onDownload: () => void;
  onChooseFiles: () => void;
  canChooseFiles: boolean;
  analyzing: boolean;
  updateError?: string;
  updateStatus?: string;
  onCancel: () => void;
}

const TEXT = {
  en: {
    title: "Longest completed run",
    subtitle: "Only explicit, uninterrupted completion can qualify.",
    chooseFiles: "Choose new files",
    cancel: "Cancel",
    analyzing: "Analyzing new files…",
    start: "Start",
    end: "End",
    model: "Model",
    totalTokens: "Total tokens",
    noLongest: "No completed, uninterrupted run was found.",
    noLongestHelp: "Incomplete and interrupted records are never promoted.",
    walTitle: "OpenCode WAL snapshot detected.",
    walText:
      "Howlong can read the main database image, but a single file may omit uncheckpointed WAL frames. Close OpenCode and copy the database after a checkpoint for the freshest result.",
    coverage: "Coverage summary",
    sources: "Sources",
    validRuns: "Valid runs",
    completed: "Completed",
    interrupted: "Interrupted",
    incomplete: "Incomplete",
    knownTokens: "Known tokens",
    allRuns: "All runs",
    download: "Download JSON",
    caption:
      "Normalized session runs, sortable by provider, status, duration, start time, and tokens.",
    run: "Run",
    provider: "Provider",
    status: "Status",
    duration: "Duration",
    started: "Started",
    ended: "Ended",
    tokens: "Tokens",
    runs: "Runs",
    previous: "Previous",
    next: "Next",
    page: (page: number, count: number) => `Page ${page} / ${count}`,
    pages: "Run table pages",
    noRuns: "No valid runs were detected in these sources.",
    sourceDetails: "Source coverage and skipped records",
    source: (ordinal: number) =>
      `Source ${String(ordinal).padStart(2, "0")}`,
    runCount: (count: number) => `${count} runs`,
    skippedCount: (count: number) => `${count} skipped records`,
    sort: (label: string, direction?: SortDirection) =>
      `Sort by ${label}${direction ? `, currently ${direction}` : ""}`,
  },
  ko: {
    title: "가장 오래 완료된 실행",
    subtitle: "명시적으로 중단 없이 완료된 실행만 선정합니다.",
    chooseFiles: "새 파일 선택",
    cancel: "취소",
    analyzing: "새 파일 분석 중…",
    start: "시작",
    end: "종료",
    model: "모델",
    totalTokens: "전체 토큰",
    noLongest: "중단 없이 완료된 실행을 찾지 못했습니다.",
    noLongestHelp: "미완료 또는 중단된 기록은 최장 실행으로 선정하지 않습니다.",
    walTitle: "OpenCode WAL 스냅샷을 감지했습니다.",
    walText:
      "Howlong은 기본 데이터베이스를 읽을 수 있지만 단일 파일에는 아직 체크포인트되지 않은 WAL 기록이 빠질 수 있습니다. 최신 결과가 필요하면 OpenCode를 종료하고 체크포인트 후 데이터베이스를 복사하세요.",
    coverage: "분석 범위 요약",
    sources: "소스",
    validRuns: "유효 실행",
    completed: "완료",
    interrupted: "중단",
    incomplete: "미완료",
    knownTokens: "확인된 토큰",
    allRuns: "모든 실행",
    download: "JSON 다운로드",
    caption:
      "제공자, 상태, 실행시간, 시작 시각, 토큰으로 정렬할 수 있는 정규화된 세션 실행 목록입니다.",
    run: "실행",
    provider: "제공자",
    status: "상태",
    duration: "실행시간",
    started: "시작",
    ended: "종료",
    tokens: "토큰",
    runs: "실행 목록",
    previous: "이전",
    next: "다음",
    page: (page: number, count: number) => `${page} / ${count} 페이지`,
    pages: "실행 목록 페이지",
    noRuns: "유효한 실행을 찾지 못했습니다.",
    sourceDetails: "소스 범위와 제외된 레코드",
    source: (ordinal: number) =>
      `소스 ${String(ordinal).padStart(2, "0")}`,
    runCount: (count: number) => `실행 ${count}개`,
    skippedCount: (count: number) => `제외 ${count}개`,
    sort: (label: string, direction?: SortDirection) =>
      `${label} 정렬${direction ? `, 현재 ${direction}` : ""}`,
  },
};

function statusRank(run: NormalizedRun) {
  if (run.status === "completed") return 0;
  if (run.status === "interrupted") return 1;
  return 2;
}

function compareRuns(
  left: NormalizedRun,
  right: NormalizedRun,
  key: SortKey,
) {
  if (key === "duration") {
    return (left.durationMs ?? -1) - (right.durationMs ?? -1);
  }
  if (key === "tokens") {
    return (left.tokens.total ?? -1) - (right.tokens.total ?? -1);
  }
  if (key === "provider") {
    return left.provider.localeCompare(right.provider);
  }
  if (key === "status") {
    return statusRank(left) - statusRank(right);
  }
  return left.startedAt.localeCompare(right.startedAt);
}

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  sortLabel,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  sortLabel: (label: string, direction?: SortDirection) => string;
}) {
  const active = sortKey === activeKey;
  return (
    <button
      type="button"
      className="sort-button"
      onClick={() => onSort(sortKey)}
      aria-label={sortLabel(label, active ? direction : undefined)}
    >
      {label}
      <span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function RunMobile({
  run,
  locale,
}: {
  run: NormalizedRun;
  locale: Locale;
}) {
  const text = TEXT[locale];
  return (
    <article
      className="mobile-run"
      aria-label={`${run.id}, ${statusLabel(run.status, locale)}`}
    >
      <div className="mobile-run__topline">
        <span className={`status status--${run.status}`}>
          {statusLabel(run.status, locale)}
        </span>
        <span className="mono">{run.id}</span>
      </div>
      <strong className="mobile-run__duration">
        {formatDuration(run.durationMs, locale)}
      </strong>
      <dl>
        <div>
          <dt>{text.provider}</dt>
          <dd>{providerLabel(run.provider, locale)}</dd>
        </div>
        <div>
          <dt>{text.started}</dt>
          <dd>
            <time dateTime={run.startedAt}>
              {formatTimestamp(run.startedAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt>{text.ended}</dt>
          <dd>
            {run.endedAt ? (
              <time dateTime={run.endedAt}>
                {formatTimestamp(run.endedAt)}
              </time>
            ) : (
              unavailableLabel(locale)
            )}
          </dd>
        </div>
        <div>
          <dt>{text.model}</dt>
          <dd>{run.model ?? unavailableLabel(locale)}</dd>
        </div>
        <div>
          <dt>{text.tokens}</dt>
          <dd>{formatNumber(run.tokens.total, locale)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function Results({
  result,
  locale,
  onDownload,
  onChooseFiles,
  canChooseFiles,
  analyzing,
  updateError,
  updateStatus,
  onCancel,
}: ResultsProps) {
  const text = TEXT[locale];
  const [sortKey, setSortKey] = useState<SortKey>("duration");
  const [direction, setDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState(1);
  const longest = result.runs.find(
    (run) => run.id === result.longestCompletedRunId,
  );
  const hasWalSnapshot = result.sources.some((source) =>
    source.warningCodes.includes("WAL_SNAPSHOT_MAY_BE_STALE"),
  );

  const sortedRuns = useMemo(() => {
    return [...result.runs].sort((left, right) => {
      const comparison = compareRuns(left, right, sortKey);
      const directed = direction === "asc" ? comparison : -comparison;
      return directed || left.id.localeCompare(right.id);
    });
  }, [direction, result.runs, sortKey]);

  const pageCount = Math.max(1, Math.ceil(sortedRuns.length / PAGE_SIZE));
  const visibleRuns = sortedRuns.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection(key === "started" || key === "provider" ? "asc" : "desc");
    }
    setPage(1);
  };

  useEffect(() => {
    setPage(1);
  }, [result]);

  return (
    <section id="results" className="results" aria-labelledby="results-title">
      <div className="results-header">
        <div>
          <h2 id="results-title" tabIndex={-1}>
            {text.title}
          </h2>
          <p>{text.subtitle}</p>
        </div>
        <div className="reanalyze-action">
          {analyzing ? (
            <>
              <button
                type="button"
                className="button button--accent"
                disabled
              >
                {updateStatus ?? text.analyzing}
              </button>
              <button
                type="button"
                className="reanalyze-action__cancel"
                onClick={onCancel}
              >
                {text.cancel}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button button--accent"
              onClick={onChooseFiles}
              disabled={!canChooseFiles}
            >
              {text.chooseFiles}
            </button>
          )}
        </div>
      </div>

      {updateError && (
        <p className="results-update-error" role="alert">
          {updateError}
        </p>
      )}

      {longest ? (
        <article className="longest-run" data-testid="longest-run">
          <div className="longest-run__mark" aria-hidden="true">
            01
          </div>
          <div className="longest-run__primary">
            <p>
              {providerLabel(longest.provider, locale)} · {longest.id}
            </p>
            <strong>{formatDuration(longest.durationMs, locale)}</strong>
            <span>{evidenceLabel(longest.completionEvidence, locale)}</span>
          </div>
          <dl className="longest-run__facts">
            <div>
              <dt>{text.start}</dt>
              <dd>
                <time dateTime={longest.startedAt}>
                  {formatTimestamp(longest.startedAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>{text.end}</dt>
              <dd>
                <time dateTime={longest.endedAt}>
                  {formatTimestamp(longest.endedAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>{text.model}</dt>
              <dd>{longest.model ?? unavailableLabel(locale)}</dd>
            </div>
            <div>
              <dt>{text.totalTokens}</dt>
              <dd>{formatNumber(longest.tokens.total, locale)}</dd>
            </div>
          </dl>
        </article>
      ) : (
        <div className="empty-longest">
          <strong>{text.noLongest}</strong>
          <p>{text.noLongestHelp}</p>
        </div>
      )}

      {hasWalSnapshot && (
        <aside className="source-warning" role="note">
          <strong>{text.walTitle}</strong>
          <span>{text.walText}</span>
        </aside>
      )}

      <div className="metric-grid" aria-label={text.coverage}>
        <div>
          <span>{text.sources}</span>
          <strong>{formatNumber(result.totals.sources, locale)}</strong>
        </div>
        <div>
          <span>{text.validRuns}</span>
          <strong>{formatNumber(result.totals.runs, locale)}</strong>
        </div>
        <div>
          <span>{text.completed}</span>
          <strong>{formatNumber(result.totals.completed, locale)}</strong>
        </div>
        <div>
          <span>{text.interrupted}</span>
          <strong>{formatNumber(result.totals.interrupted, locale)}</strong>
        </div>
        <div>
          <span>{text.incomplete}</span>
          <strong>{formatNumber(result.totals.incomplete, locale)}</strong>
        </div>
        <div>
          <span>{text.knownTokens}</span>
          <strong>{formatNumber(result.totals.tokens, locale)}</strong>
        </div>
      </div>

      <div className="turns-heading">
        <h2>{text.allRuns}</h2>
        <div className="result-actions">
          <button type="button" className="button button--dark" onClick={onDownload}>
            {text.download}
          </button>
        </div>
      </div>

      {result.runs.length > 0 ? (
        <>
          <div className="table-shell">
            <table>
              <caption className="sr-only">
                {text.caption}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{text.run}</th>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === "provider"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label={text.provider}
                      sortKey="provider"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                      sortLabel={text.sort}
                    />
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === "status"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label={text.status}
                      sortKey="status"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                      sortLabel={text.sort}
                    />
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === "duration"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label={text.duration}
                      sortKey="duration"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                      sortLabel={text.sort}
                    />
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === "started"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label={text.started}
                      sortKey="started"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                      sortLabel={text.sort}
                    />
                  </th>
                  <th scope="col">{text.ended}</th>
                  <th scope="col">{text.model}</th>
                  <th
                    scope="col"
                    aria-sort={
                      sortKey === "tokens"
                        ? direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    <SortButton
                      label={text.tokens}
                      sortKey="tokens"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                      sortLabel={text.sort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">{run.id}</td>
                    <td>{providerLabel(run.provider, locale)}</td>
                    <td>
                      <span className={`status status--${run.status}`}>
                        {statusLabel(run.status, locale)}
                      </span>
                    </td>
                    <td className="numeric">
                      {formatDuration(run.durationMs, locale)}
                    </td>
                    <td>
                      <time dateTime={run.startedAt}>
                        {formatTimestamp(run.startedAt)}
                      </time>
                    </td>
                    <td>
                      {run.endedAt ? (
                        <time dateTime={run.endedAt}>
                          {formatTimestamp(run.endedAt)}
                        </time>
                      ) : (
                        unavailableLabel(locale)
                      )}
                    </td>
                    <td className="model-cell">
                      {run.model ?? unavailableLabel(locale)}
                    </td>
                    <td className="numeric">
                      {formatNumber(run.tokens.total, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-runs" aria-label={text.runs}>
            {visibleRuns.map((run) => (
              <RunMobile key={run.id} run={run} locale={locale} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav className="pagination" aria-label={text.pages}>
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                {text.previous}
              </button>
              <span>
                {text.page(page, pageCount)}
              </span>
              <button
                type="button"
                disabled={page === pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                {text.next}
              </button>
            </nav>
          )}
        </>
      ) : (
        <p className="no-runs">{text.noRuns}</p>
      )}

      <details className="source-details">
        <summary>{text.sourceDetails}</summary>
        <div>
          {result.sources.map((source) => {
            const skipped =
              source.malformedRecords +
              source.oversizedRecords +
              source.ignoredRecords;
            return (
              <p key={source.sourceOrdinal}>
                <span>{text.source(source.sourceOrdinal)}</span>
                <span>{providerLabel(source.provider, locale)}</span>
                <span>{text.runCount(source.runCount)}</span>
                <span>{text.skippedCount(skipped)}</span>
              </p>
            );
          })}
        </div>
      </details>
    </section>
  );
}
