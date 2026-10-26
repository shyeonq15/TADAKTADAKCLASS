// 연습 트랙 단계: 티어 6개 × 5단계 = 트랙마다 30단계 (config/game.ts STAGE_PLAN)

import { PLACEMENT, STAGE_ACCURACY, STAGE_PLAN, STEPS_PER_TIER, TIER_LABELS, TIERS, type Tier, type Track } from "@/config/game";
import { getLevel, type Level, type PracticeMode } from "@/data/packs";
import { getTrackStage } from "@/lib/packs";

export type Stage = {
  /** 1~30 */
  stage: number;
  tier: Tier;
  /** 티어 안에서 몇 단계 (1~5) */
  step: number;
  /** 글 난이도 (연습팩 레벨) */
  level: Level;
  goalCpm: number;
  minAccuracy: number;
};

export const STAGE_COUNT = TIERS.length * STEPS_PER_TIER;

export const tierOfStage = (n: number): Tier => TIERS[Math.min(TIERS.length - 1, Math.floor((Math.max(1, n) - 1) / STEPS_PER_TIER))];
export const stepOfStage = (n: number) => ((Math.max(1, n) - 1) % STEPS_PER_TIER) + 1;

/** "실버 3단계" */
export const stageName = (n: number) => `${TIER_LABELS[tierOfStage(n)]} ${stepOfStage(n)}단계`;

/** 트랙 연습팩(교과서 지문)의 글 종류 → 한 판 만드는 방식 */
const TIER_MODE: Record<Tier, PracticeMode> = {
  bronze: "keys",
  silver: "words",
  gold: "sentences",
  diamond: "sentences",
  master: "paragraph",
  legend: "paragraph",
};

export function getStage(track: Track, n: number): Stage | undefined {
  const plan = STAGE_PLAN[track][n - 1];
  if (!plan) return undefined;
  const base = getLevel(track, plan[0]);
  if (!base) return undefined;
  const tier = tierOfStage(n);
  const step = stepOfStage(n);
  // 트랙 연습팩이 있으면(한글) 그 단계의 교과서 지문으로 연습해요. 한 판 만드는 방식·목표는 그대로
  const pack = getTrackStage(track, tier, step);
  const level: Level = pack?.passages.length
    ? { ...base, mode: TIER_MODE[tier], items: pack.passages.map((p) => p.text) }
    : base;
  return { stage: n, tier, step, level, goalCpm: plan[1], minAccuracy: STAGE_ACCURACY[tier] };
}

/** 배치 테스트 타수로 시작 단계 정하기: 목표 타수를 넘는 가장 높은 단계 (최대 골드 1단계) */
export function startStage(track: Track, cpm: number) {
  let start = 1;
  for (let n = 1; n <= Math.min(PLACEMENT.maxStartStage, STAGE_COUNT); n++) {
    if (cpm >= STAGE_PLAN[track][n - 1][1]) start = n;
  }
  return start;
}

/** 지금 단계의 글 난이도 (단어 비 단어, 빈칸 채우기 범위 등에 사용) */
export const contentLevelOf = (track: Track, stage: number) => STAGE_PLAN[track][Math.min(stage, STAGE_COUNT) - 1]?.[0] ?? 1;
