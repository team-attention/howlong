import { useMemo, useState } from "react";
import type { AnalysisResult, NormalizedRun } from "../core/types";
import {
  evidenceLabel,
  formatDuration,
  formatNumber,
  formatTimestamp,
  providerLabel,
  statusLabel,
} from "../core/format";

const PAGE_SIZE = 50;

type SortKey = "duration" | "started" | "tokens" | "provider" | "status";
type SortDirection = "asc" | "desc";

interface ResultsProps {
  result: AnalysisResult;
  onDownload: () => void;
  onClear: () => void;
}

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
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeKey;
  return (
    <button
      type="button"
      className="sort-button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}${active ? `, currently ${direction}` : ""}`}
    >
      {label}
      <span aria-hidden="true">{active ? (direction === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
}

function RunMobile({ run }: { run: NormalizedRun }) {
  return (
    <article
      className="mobile-run"
      aria-label={`${run.id}, ${statusLabel(run.status)}`}
    >
      <div className="mobile-run__topline">
        <span className={`status status--${run.status}`}>
          {statusLabel(run.status)}
        </span>
        <span className="mono">{run.id}</span>
      </div>
      <strong className="mobile-run__duration">
        {formatDuration(run.durationMs)}
      </strong>
      <dl>
        <div>
          <dt>Provider</dt>
          <dd>{providerLabel(run.provider)}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>
            <time dateTime={run.startedAt}>
              {formatTimestamp(run.startedAt)}
            </time>
          </dd>
        </div>
        <div>
          <dt>Ended</dt>
          <dd>
            {run.endedAt ? (
              <time dateTime={run.endedAt}>
                {formatTimestamp(run.endedAt)}
              </time>
            ) : (
              "Unavailable"
            )}
          </dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{run.model ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Tokens</dt>
          <dd>{formatNumber(run.tokens.total)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function Results({ result, onDownload, onClear }: ResultsProps) {
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

  return (
    <section id="results" className="results" aria-labelledby="results-title">
      <div className="section-heading">
        <p className="eyebrow">Analysis / 01</p>
        <div>
          <h2 id="results-title">The longest clean run</h2>
          <p>
            Only a run with an explicit, non-interrupted terminal signal can
            win.
          </p>
        </div>
      </div>

      {longest ? (
        <article className="longest-run" data-testid="longest-run">
          <div className="longest-run__mark" aria-hidden="true">
            01
          </div>
          <div className="longest-run__primary">
            <p>
              {providerLabel(longest.provider)} · {longest.id}
            </p>
            <strong>{formatDuration(longest.durationMs)}</strong>
            <span>{evidenceLabel(longest.completionEvidence)}</span>
          </div>
          <dl className="longest-run__facts">
            <div>
              <dt>Start</dt>
              <dd>
                <time dateTime={longest.startedAt}>
                  {formatTimestamp(longest.startedAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>End</dt>
              <dd>
                <time dateTime={longest.endedAt}>
                  {formatTimestamp(longest.endedAt)}
                </time>
              </dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{longest.model ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Total tokens</dt>
              <dd>{formatNumber(longest.tokens.total)}</dd>
            </div>
          </dl>
        </article>
      ) : (
        <div className="empty-longest">
          <strong>No completed, uninterrupted run was found.</strong>
          <p>Incomplete and interrupted records are never promoted.</p>
        </div>
      )}

      {hasWalSnapshot && (
        <aside className="source-warning" role="note">
          <strong>OpenCode WAL snapshot detected.</strong>
          <span>
            Turnspan can read the main database image, but uncheckpointed WAL
            frames are not present in a single uploaded file. Close OpenCode
            and copy the database after a checkpoint for the freshest result.
          </span>
        </aside>
      )}

      <div className="metric-grid" aria-label="Coverage summary">
        <div>
          <span>Sources</span>
          <strong>{formatNumber(result.totals.sources)}</strong>
        </div>
        <div>
          <span>Valid runs</span>
          <strong>{formatNumber(result.totals.runs)}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{formatNumber(result.totals.completed)}</strong>
        </div>
        <div>
          <span>Interrupted</span>
          <strong>{formatNumber(result.totals.interrupted)}</strong>
        </div>
        <div>
          <span>Incomplete</span>
          <strong>{formatNumber(result.totals.incomplete)}</strong>
        </div>
        <div>
          <span>Known tokens</span>
          <strong>{formatNumber(result.totals.tokens)}</strong>
        </div>
      </div>

      <div className="turns-heading">
        <div>
          <p className="eyebrow">Analysis / 02</p>
          <h2>Every valid run</h2>
        </div>
        <div className="result-actions">
          <button type="button" className="button button--dark" onClick={onDownload}>
            Download metadata JSON
          </button>
          <button type="button" className="button button--quiet" onClick={onClear}>
            Clear analysis
          </button>
        </div>
      </div>

      {result.runs.length > 0 ? (
        <>
          <div className="table-shell">
            <table>
              <caption className="sr-only">
                Normalized session runs, sortable by provider, status,
                duration, start time, and tokens.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Run</th>
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
                      label="Provider"
                      sortKey="provider"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
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
                      label="Status"
                      sortKey="status"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
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
                      label="Duration"
                      sortKey="duration"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
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
                      label="Started"
                      sortKey="started"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                    />
                  </th>
                  <th scope="col">Ended</th>
                  <th scope="col">Model</th>
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
                      label="Tokens"
                      sortKey="tokens"
                      activeKey={sortKey}
                      direction={direction}
                      onSort={handleSort}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRuns.map((run) => (
                  <tr key={run.id}>
                    <td className="mono">{run.id}</td>
                    <td>{providerLabel(run.provider)}</td>
                    <td>
                      <span className={`status status--${run.status}`}>
                        {statusLabel(run.status)}
                      </span>
                    </td>
                    <td className="numeric">
                      {formatDuration(run.durationMs)}
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
                        "Unavailable"
                      )}
                    </td>
                    <td className="model-cell">
                      {run.model ?? "Unavailable"}
                    </td>
                    <td className="numeric">
                      {formatNumber(run.tokens.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-runs" aria-label="Runs">
            {visibleRuns.map((run) => (
              <RunMobile key={run.id} run={run} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav className="pagination" aria-label="Run table pages">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} / {pageCount}
              </span>
              <button
                type="button"
                disabled={page === pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </>
      ) : (
        <p className="no-runs">No valid runs were detected in these sources.</p>
      )}

      <details className="source-details">
        <summary>Source coverage and skipped records</summary>
        <div>
          {result.sources.map((source) => {
            const skipped =
              source.malformedRecords +
              source.oversizedRecords +
              source.ignoredRecords;
            return (
              <p key={source.sourceOrdinal}>
                <span>Source {String(source.sourceOrdinal).padStart(2, "0")}</span>
                <span>{providerLabel(source.provider)}</span>
                <span>{source.runCount} runs</span>
                <span>{skipped} skipped records</span>
              </p>
            );
          })}
        </div>
      </details>
    </section>
  );
}
