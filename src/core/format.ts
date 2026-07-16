import type {
  CompletionEvidence,
  Provider,
  RunStatus,
} from "./types";

export type Locale = "en" | "ko";

export function unavailableLabel(locale: Locale): string {
  return locale === "ko" ? "확인 불가" : "Unavailable";
}

export function formatNumber(
  value: number | undefined,
  locale: Locale = "en",
): string {
  return value === undefined
    ? unavailableLabel(locale)
    : new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(
        value,
      );
}

export function formatDuration(
  value: number | undefined,
  locale: Locale = "en",
): string {
  if (value === undefined) {
    return unavailableLabel(locale);
  }

  const totalSeconds = Math.floor(value / 1_000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (locale === "ko") {
    if (days > 0) {
      return `${days}일 ${hours}시간 ${minutes}분`;
    }
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${seconds}초`;
    }
    if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    }
    if (totalSeconds > 0) {
      return `${totalSeconds}초`;
    }
    return `${value}ms`;
  }

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
    return "—";
  }
  return `${value.replace("T", " ").replace(/\.\d{3}Z$/, "")} UTC`;
}

export function providerLabel(
  provider: Provider | undefined,
  locale: Locale = "en",
): string {
  if (provider === "codex") return "Codex";
  if (provider === "claude") return "Claude Code";
  if (provider === "opencode") return "OpenCode";
  return locale === "ko" ? "지원하지 않음" : "Unsupported";
}

export function statusLabel(
  status: RunStatus,
  locale: Locale = "en",
): string {
  if (locale === "ko") {
    if (status === "completed") return "완료";
    if (status === "interrupted") return "중단";
    return "미완료";
  }
  if (status === "completed") return "Completed";
  if (status === "interrupted") return "Interrupted";
  return "Incomplete";
}

export function evidenceLabel(
  evidence: CompletionEvidence,
  locale: Locale = "en",
): string {
  const labels: Record<Locale, Record<CompletionEvidence, string>> = {
    en: {
    "explicit-complete": "Explicit completion",
    "explicit-duration": "Recorded turn duration",
    "terminal-stop": "Terminal stop reason",
    "terminal-error": "Terminal error",
    "explicit-abort": "Explicit interruption",
    "non-clean-terminal": "Non-clean terminal reason",
    "missing-terminal-event": "No terminal event",
    },
    ko: {
      "explicit-complete": "명시적 완료",
      "explicit-duration": "기록된 실행시간",
      "terminal-stop": "정상 종료 신호",
      "terminal-error": "오류 종료",
      "explicit-abort": "명시적 중단",
      "non-clean-terminal": "비정상 종료 신호",
      "missing-terminal-event": "종료 신호 없음",
    },
  };
  return labels[locale][evidence];
}
