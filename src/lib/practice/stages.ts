// 연습 트랙 단계: 티어 6개 × 5단계 = 트랙마다 30단계 (config/game.ts STAGE_PLAN)

import { LESSON_GATED_TRACKS, PLACEMENT, STAGE_ACCURACY, STAGE_PLAN, STEPS_PER_TIER, TIER_LABELS, TIERS, type Tier, type Track } from "@/config/game";
import { getLevel, type Level, type PracticeMode } from "@/data/packs";
import STAGE_META from "@/data/packs/stage-meta.json";

/** 트랙 연습팩 요약 (scripts/build-stage-meta.mjs 가 만듦). 지문 본문은 서버 전용 packStage.ts 에서 */
type StageMeta = { title: string; lessons: number[]; passages: number; roundSize: number };
const metaOf = (track: Track, tier: Tier, step: number): StageMeta | undefined =>
  (STAGE_META as unknown as Partial<Record<Track, { stages: Record<string, StageMeta> }>>)[track]?.stages[`${tier}-${step}`];

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
  /** 트랙 연습팩(교과서·자료집 지문)에서 왔는지 */
  fromPack: boolean;
  /** 연결된 파이썬 첫걸음 강 번호 (기호·코드) */
  lessons: number[];
  /** 한 판에 뽑을 지문 수 (기호·코드: 연습팩 round 값. 한글은 예전 방식이라 없음) */
  roundSize?: number;
};

export const STAGE_COUNT = TIERS.length * STEPS_PER_TIER;

export const tierOfStage = (n: number): Tier => TIERS[Math.min(TIERS.length - 1, Math.floor((Math.max(1, n) - 1) / STEPS_PER_TIER))];
export const stepOfStage = (n: number) => ((Math.max(1, n) - 1) % STEPS_PER_TIER) + 1;

/** "실버 3단계" */
export const stageName = (n: number) => `${TIER_LABELS[tierOfStage(n)]} ${stepOfStage(n)}단계`;

/** 트랙 연습팩(교과서 지문)의 글 종류 → 한 판 만드는 방식 */
const TEXT_MODE: Record<Tier, PracticeMode> = {
  bronze: "keys",
  silver: "words",
  gold: "sentences",
  diamond: "sentences",
  master: "paragraph",
  legend: "paragraph",
};
const TIER_MODE: Partial<Record<Track, Record<Tier, PracticeMode>>> = {
  korean: TEXT_MODE,
  // 기호: 한 줄짜리는 줄 단위, 마스터·레전드는 여러 줄 코드 (줄바꿈·들여쓰기 유지)
  symbol: { ...TEXT_MODE, master: "code", legend: "code" },
  code: { bronze: "code", silver: "code", gold: "code", diamond: "code", master: "code", legend: "code" },
};
/** 한 판 분량을 연습팩 round 값으로 정하는 트랙 (한글은 예전 방식 그대로) */
const PACK_ROUND_TRACKS: readonly Track[] = ["symbol", "code"];

export function getStage(track: Track, n: number): Stage | undefined {
  const plan = STAGE_PLAN[track][n - 1];
  if (!plan) return undefined;
  const base = getLevel(track, plan[0]);
  if (!base) return undefined;
  const tier = tierOfStage(n);
  const step = stepOfStage(n);
  // 트랙 연습팩이 있으면 그 단계의 교과서·자료집 지문으로 연습해요 (지문은 서버가 붙임). 목표 타수는 그대로
  const meta = metaOf(track, tier, step);
  const fromPack = !!meta?.passages;
  const level: Level = fromPack
    ? {
        ...base,
        mode: TIER_MODE[track]?.[tier] ?? base.mode,
        // 단계 이름: 브론즈 한글은 자리 이름("기본 자리 (가운데 줄)"), 기호·코드는 "elif 여러 갈래" 같은 제목, 나머지는 글 종류
        title: meta!.title,
      }
    : base;
  return {
    stage: n,
    tier,
    step,
    level,
    goalCpm: plan[1],
    minAccuracy: STAGE_ACCURACY[tier],
    fromPack,
    lessons: meta?.lessons ?? [],
    roundSize: fromPack && PACK_ROUND_TRACKS.includes(track) ? meta!.roundSize : undefined,
  };
}

/** 아직 안 들은 연결 강 (코드 트랙: 이 강을 다 들어야 그 단계가 열려요). 빈 목록이면 열림 */
export function missingLessons(track: Track, n: number, cleared: readonly string[]): number[] {
  if (!LESSON_GATED_TRACKS.includes(track)) return [];
  return (getStage(track, n)?.lessons ?? []).filter((l) => !cleared.includes(`lesson-${l}`));
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
