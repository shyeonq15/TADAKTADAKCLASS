// 기록에서 값을 뽑아내는 순수 함수 (서버·화면 공용)

import type { Track } from "@/config/game";
import { dailyGrowth, median } from "@/lib/scoring/growth";
import { dayKeyKST } from "./day";
import type { Attempt, PracticeData } from "./types";

/** 같은 트랙·레벨 최근 5회 중앙값 (결과 화면의 "내 평균") */
export function recentMedian(attempts: readonly Attempt[], track: Track, level: number) {
  const recent = attempts
    .filter((a) => a.track === track && a.level === level && !a.suspicious && a.kind !== "placement")
    .slice(-5);
  if (recent.length === 0) return null;
  return { cpm: median(recent.map((a) => a.cpm)), accuracy: median(recent.map((a) => a.accuracy)) };
}

/** 약한 키 상위 n개 (트랙을 주면 그 트랙만, 최근 30판 기준) */
export function weakKeys(attempts: readonly Attempt[], track?: Track, n = 5): { key: string; count: number }[] {
  const total: Record<string, number> = {};
  for (const a of attempts.slice(-30)) {
    if (track && a.track !== track) continue;
    for (const [k, c] of Object.entries(a.missedKeys)) total[k] = (total[k] ?? 0) + c;
  }
  return Object.entries(total)
    .filter(([k]) => k.trim())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** 오늘까지 연속으로 연습한 날 수 (한국 시간) */
export function streakDays(attempts: readonly Attempt[], now = Date.now()) {
  const days = new Set(attempts.map((a) => dayKeyKST(a.at)));
  let n = 0;
  let t = now;
  if (!days.has(dayKeyKST(t))) t -= 86400000; // 오늘 아직 안 쳤으면 어제부터
  while (days.has(dayKeyKST(t))) {
    n++;
    t -= 86400000;
  }
  return n;
}

/** 오늘의 성장 점수 (서버 저장값과 같은 계산) */
export function todayGrowth(data: PracticeData, now = Date.now()) {
  const today = dayKeyKST(now);
  const scored = data.attempts.filter((a) => a.kind !== "placement");
  return dailyGrowth({
    today: scored.filter((a) => dayKeyKST(a.at) === today),
    history: scored.filter((a) => dayKeyKST(a.at) < today),
    missionDone: data.progress.missionDays.includes(today),
    streakDays: streakDays(data.attempts, now),
    firstClearToday: data.progress.clearLog.some((c) => dayKeyKST(c.at) === today),
    placement: data.progress.placement ?? undefined,
  });
}
