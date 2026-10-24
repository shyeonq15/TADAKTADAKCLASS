// 실력 티어 계산 (CLAUDE.md 3-2). 트랙별로 따로, 하락 없음.

import { TIER_MIN_CPM, TIER_RULES, TIERS, TRACKS, type Tier, type Track } from "@/config/game";

export type TierAttempt = { track: Track; cpm: number; accuracy: number; suspicious: boolean };

/** 정확도 95% 이상 기록 중 기준을 넘은 것이 3번 이상인 가장 높은 티어 */
export function trackTier(attempts: readonly TierAttempt[], track: Track): Tier {
  const valid = attempts.filter((a) => a.track === track && !a.suspicious && a.accuracy >= TIER_RULES.minAccuracy);
  let best: Tier = "bronze";
  for (const tier of TIERS) {
    const count = valid.filter((a) => a.cpm >= TIER_MIN_CPM[track][tier]).length;
    if (tier === "bronze" || count >= TIER_RULES.recordsToPromote) best = tier;
  }
  return best;
}

export function allTiers(attempts: readonly TierAttempt[]): Record<Track, Tier> {
  return Object.fromEntries(TRACKS.map((t) => [t, trackTier(attempts, t)])) as Record<Track, Tier>;
}

/** 프로필에는 세 트랙 중 가장 높은 티어 */
export function profileTier(tiers: Record<Track, Tier>): Tier {
  return TRACKS.map((t) => tiers[t]).reduce((a, b) => (TIERS.indexOf(b) > TIERS.indexOf(a) ? b : a), "bronze");
}

export const isCodeMaster = (tiers: Record<Track, Tier>) => tiers.code === "diamond";
