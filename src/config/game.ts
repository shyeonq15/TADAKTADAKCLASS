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

/* ── 연습 레벨 ── */
export const LEVEL_CLEAR = {
  /** 레벨 통과에 필요한 정확도(%). 타수 기준은 연습팩의 레벨마다 따로 있음 */
  minAccuracy: 90,
} as const;

/* ── 부정행위 감지 (CLAUDE.md 6장) ── */
export const INTEGRITY = {
  /** 이 타수(타/분)를 넘으면 사람이 치기 어려운 속도로 봄 */
  maxCpm: { korean: 900, english: 800, symbol: 600, code: 600 } as Record<Track, number>,
  /** 입력 간격의 변동계수(표준편차÷평균)가 이보다 작으면 너무 일정한 입력 */
  minIntervalVariation: 0.15,
  /** 위 검사를 하려면 최소 이만큼의 키 입력이 필요 */
  minKeysForCheck: 40,
} as const;

/* ── 배치 테스트 ── */
export const PLACEMENT = {
  /** 트랙마다 몇 초씩 칠지 (4트랙 × 30초 = 2분) */
  secondsPerTrack: 30,
  /** 타수가 이 값 이상이면 그 레벨부터 시작 (레벨 1은 항상 열림) */
  startLevelCpm: {
    korean: [0, 80, 140, 200, 260],
    english: [0, 60, 100, 140, 180],
    symbol: [0, 50, 80, 110, 140],
    code: [0, 50, 80, 110, 140],
  } as Record<Track, number[]>,
} as const;

/* ── 오늘의 미션 ── */
export const MISSION = {
  /** 미션 한 번에 치는 판 수 (3~5분 분량) */
  rounds: 3,
} as const;

/* ── 화폐 (지급량은 시범 2주 데이터로 결정, 지금은 임시값) ── */
export const COINS = {
  missionPersonal: 30,
  missionClass: 5,
  personalBest: 10,
  practiceRound: 2,
} as const;

/* ── 혼자 하는 게임 ── */
export const GAMES = {
  rain: {
    /** 성장 점수 기준값을 게임끼리만 비교하려고 쓰는 레벨 값 */
    level: -1,
    hearts: 3,
    /** 한 판 최대 시간(초) */
    maxSeconds: 150,
    /** 몇 개 터뜨릴 때마다 단계가 오르는지 */
    hitsPerStage: 8,
    /** 바닥까지 떨어지는 시간(초): 처음 → 최소 */
    fallSeconds: { start: 9, min: 3.5, perStage: 0.7 },
    /** 새 단어가 나오는 간격(초): 처음 → 최소 */
    spawnSeconds: { start: 2.4, min: 0.9, perStage: 0.2 },
    maxOnScreen: 8,
    /** 콤보 5개마다 점수 배율 +0.5 */
    comboStep: 5,
    comboBonus: 0.5,
  },
} as const;

export const GAME_COINS = {
  /** 게임 한 판 */
  play: 3,
  /** 게임 최고 점수 갱신 */
  best: 10,
} as const;
