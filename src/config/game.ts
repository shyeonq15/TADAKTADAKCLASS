/**
 * 점수·티어·화폐 수치 모음 (CLAUDE.md 3장).
 * 시범 2주 후 조정할 숫자는 모두 여기서만 바꿉니다.
 */

export const TRACKS = ["korean", "english", "symbol", "code"] as const;
export type Track = (typeof TRACKS)[number];

export const TRACK_LABELS: Record<Track, string> = {
  korean: "한글",
  english: "영타",
  symbol: "기호",
  code: "코드",
};

/* ── 성장 점수 (반 대결용) ── */
export const GROWTH = {
  /** 기준값 = 최근 N회 기록의 중앙값 */
  baselineSampleSize: 5,
  /** 이 정확도(%) 미만이면 속도 향상 점수 0점 */
  minAccuracyForSpeed: 85,
  /** 하루 상한 */
  dailyCap: 50,
  participation: { points: 10 },
  /** 기준값 대비 1% 오를 때마다 1점 */
  speed: { pointsPerPercent: 1, max: 15 },
  /** 기준값 대비 1%p 오를 때마다 1점 */
  accuracy: { pointsPerPoint: 1, max: 5 },
  /** 연속 일수 × 2점 */
  streak: { pointsPerDay: 2, max: 10 },
  levelFirstClear: { points: 10 },
  /** 반 대결 집계 주기(일) */
  classBattlePeriodDays: 14,
} as const;

/* ── 실력 티어 (개인 명예용, 트랙별) ── */
export const TIERS = ["bronze", "silver", "gold", "diamond"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  diamond: "다이아",
};

/** 각 티어의 최소 타수(타/분). 기호와 코드는 같은 기준을 씁니다. */
export const TIER_MIN_CPM: Record<Track, Record<Tier, number>> = {
  korean: { bronze: 0, silver: 150, gold: 250, diamond: 350 },
  english: { bronze: 0, silver: 100, gold: 180, diamond: 260 },
  symbol: { bronze: 0, silver: 80, gold: 140, diamond: 200 },
  code: { bronze: 0, silver: 80, gold: 140, diamond: 200 },
};

export const TIER_RULES = {
  /** 이 정확도(%) 이상인 기록만 인정 */
  minAccuracy: 95,
  /** 기준을 넘는 기록이 이만큼 나와야 승급 */
  recordsToPromote: 3,
  /** 학기 중 티어 하락 없음 */
  canDemote: false,
} as const;
