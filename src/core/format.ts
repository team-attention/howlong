import type {
  CompletionEvidence,
  Provider,
  RunStatus,
} from "./types";

const numberFormatter = new Intl.NumberFormat("en-US");

export function formatNumber(value: number | undefined): string {
  return value === undefined ? "Unavailable" : numberFormatter.format(value);
}

export function formatDuration(value: number | undefined): string {
  if (value === undefined) {
    return "Unavailable";
  }

  const totalSeconds = Math.floor(value / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  if (totalSeconds > 0) {
    return `${totalSeconds}s`;
  }
  return `${value}ms`;
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return "Unavailable";
  }
  return `${value.replace("T", " ").replace(/\.\d{3}Z$/, "")} UTC`;
}

export function providerLabel(provider: Provider | undefined): string {
  if (provider === "codex") return "Codex";
  if (provider === "claude") return "Claude Code";
  if (provider === "opencode") return "OpenCode";
  return "Unsupported";
}

export function statusLabel(status: RunStatus): string {
  if (status === "completed") return "Completed";
  if (status === "interrupted") return "Interrupted";
  return "Incomplete";
}

export function evidenceLabel(evidence: CompletionEvidence): string {
  const labels: Record<CompletionEvidence, string> = {
    "explicit-complete": "Explicit completion",
    "explicit-duration": "Recorded turn duration",
    "terminal-stop": "Terminal stop reason",
    "terminal-error": "Terminal error",
    "explicit-abort": "Explicit interruption",
    "non-clean-terminal": "Non-clean terminal reason",
    "missing-terminal-event": "No terminal event",
  };
  return labels[evidence];
}
