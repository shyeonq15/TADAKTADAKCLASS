// 성장 점수 계산 (CLAUDE.md 3-1). 서버에서 쓰는 순수 함수.
// 기준값 = 같은 트랙·레벨 최근 5회 기록의 중앙값 (5개 미만이면 배치 테스트 결과)

import { GROWTH, type Track } from "@/config/game";

export type ScoredAttempt = {
  track: Track;
  level: number;
  cpm: number;
  accuracy: number;
  /** 의심 기록은 점수에서 빠짐 */
  suspicious: boolean;
};

export type Baseline = { cpm: number; accuracy: number };

export function median(nums: readonly number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** history는 오래된 것 → 최근 순서 */
export function baselineFor(
  history: readonly ScoredAttempt[],
  track: Track,
  level: number,
  placementCpm?: number,
): Baseline | null {
  const same = history.filter((a) => a.track === track && a.level === level && !a.suspicious);
  const recent = same.slice(-GROWTH.baselineSampleSize);
  if (recent.length >= GROWTH.baselineSampleSize) {
    return { cpm: median(recent.map((a) => a.cpm)), accuracy: median(recent.map((a) => a.accuracy)) };
  }
  if (placementCpm) return { cpm: placementCpm, accuracy: recent.length ? median(recent.map((a) => a.accuracy)) : 90 };
  if (recent.length) return { cpm: median(recent.map((a) => a.cpm)), accuracy: median(recent.map((a) => a.accuracy)) };
  return null;
}

export type GrowthBreakdown = {
  participation: number;
  speed: number;
  accuracy: number;
  streak: number;
  firstClear: number;
  total: number;
};

/** 기록 하나가 기준값 대비 얼마나 올랐는지 → 속도·정확도 점수 */
export function improvementPoints(attempt: ScoredAttempt, base: Baseline | null) {
  if (!base || attempt.suspicious) return { speed: 0, accuracy: 0 };
  const speedPct = base.cpm > 0 ? ((attempt.cpm - base.cpm) / base.cpm) * 100 : 0;
  const speed =
    attempt.accuracy < GROWTH.minAccuracyForSpeed
      ? 0
      : Math.min(GROWTH.speed.max, Math.max(0, Math.floor(speedPct * GROWTH.speed.pointsPerPercent)));
  const accuracy = Math.min(
    GROWTH.accuracy.max,
    Math.max(0, Math.floor((attempt.accuracy - base.accuracy) * GROWTH.accuracy.pointsPerPoint)),
  );
  return { speed, accuracy };
}

export function dailyGrowth(input: {
  today: readonly ScoredAttempt[];
  /** 오늘 이전 기록 (오래된 것 → 최근) */
  history: readonly ScoredAttempt[];
  missionDone: boolean;
  streakDays: number;
  firstClearToday: boolean;
  placement?: Partial<Record<Track, number>>;
}): GrowthBreakdown {
  let speed = 0;
  let accuracy = 0;
  for (const a of input.today) {
    const p = improvementPoints(a, baselineFor(input.history, a.track, a.level, input.placement?.[a.track]));
    speed = Math.max(speed, p.speed);
    accuracy = Math.max(accuracy, p.accuracy);
  }
  const parts = {
    participation: input.missionDone ? GROWTH.participation.points : 0,
    speed,
    accuracy,
    streak: Math.min(GROWTH.streak.max, input.streakDays * GROWTH.streak.pointsPerDay),
    firstClear: input.firstClearToday ? GROWTH.levelFirstClear.points : 0,
  };
  const sum = Object.values(parts).reduce((a, b) => a + b, 0);
  return { ...parts, total: Math.min(GROWTH.dailyCap, sum) };
}
