// 실력 티어: 연습 트랙 단계와 같아요. 지금 도전 중인 단계의 티어가 그 트랙의 티어예요.
// (브론즈 5단계를 다 깨면 실버 1단계가 열리고 → 티어가 실버)

import { STAGE_PLAN, STEPS_PER_TIER, TIERS, TRACKS, type Tier, type Track } from "@/config/game";
import { STAGE_COUNT, tierOfStage } from "@/lib/practice/stages";

type Unlocked = Record<Track, number>;

export const trackTier = (unlocked: Unlocked, track: Track): Tier => tierOfStage(unlocked[track]);

export function allTiers(unlocked: Unlocked): Record<Track, Tier> {
  return Object.fromEntries(TRACKS.map((t) => [t, trackTier(unlocked, t)])) as Record<Track, Tier>;
}

/** 프로필에는 네 트랙 중 가장 높은 티어 */
export function profileTier(tiers: Record<Track, Tier>): Tier {
  return TRACKS.map((t) => tiers[t]).reduce((a, b) => (TIERS.indexOf(b) > TIERS.indexOf(a) ? b : a), "bronze");
}

/** 코드 트랙 다이아 이상이면 특별 칭호 */
export const isCodeMaster = (tiers: Record<Track, Tier>) => TIERS.indexOf(tiers.code) >= TIERS.indexOf("diamond");

/** 다음 티어까지 남은 단계 */
export function tierProgress(unlocked: Unlocked, cleared: readonly string[], track: Track) {
  const stage = unlocked[track];
  const current = tierOfStage(stage);
  const tierStart = TIERS.indexOf(current) * STEPS_PER_TIER + 1;
  const done = Array.from({ length: STEPS_PER_TIER }, (_, i) => cleared.includes(`${track}-${tierStart + i}`)).filter(Boolean).length;
  const next = TIERS[TIERS.indexOf(current) + 1] ?? null;
  const allDone = stage >= STAGE_COUNT && cleared.includes(`${track}-${STAGE_COUNT}`);
  return { current, next, done, need: STEPS_PER_TIER, allDone };
}

/** 타수로 티어 매기기: 이 트랙에서 목표 타수를 넘는 가장 높은 단계의 티어 (보스 난이도에 써요) */
export function cpmTier(track: Track, cpm: number): Tier {
  let stage = 1;
  for (let n = 1; n <= STAGE_COUNT; n++) if (cpm >= STAGE_PLAN[track][n - 1][1]) stage = n;
  return tierOfStage(stage);
}

/** 더 높은 티어 (없으면 null 이 아닌 쪽) */
export const higherTier = (a: Tier | null, b: Tier | null): Tier | null =>
  a === null ? b : b === null ? a : TIERS.indexOf(b) > TIERS.indexOf(a) ? b : a;
