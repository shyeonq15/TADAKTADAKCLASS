import type { SessionResult } from "@/components/typing/TypingSession";
import type { RoundSubmission } from "./types";

/** 끝난 판을 서버로 보낼 모양으로 바꿈 */
export function toSubmission(token: string, lines: string[], r: SessionResult): RoundSubmission {
  const s = r.state;
  const start = s.keyTimes[0] ?? 0;
  return {
    token,
    lines,
    typedLines: s.doneLines,
    durationMs: r.stats.elapsedMs,
    totalErrors: s.totalErrors,
    totalCommitted: s.totalCommitted,
    missedKeys: s.missedKeys,
    // 시각은 첫 키 기준 상대값으로 (보내는 양 줄이기)
    keyTimes: s.keyTimes.map((t) => Math.round(t - start)),
  };
}
