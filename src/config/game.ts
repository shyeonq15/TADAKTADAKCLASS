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

/* ── 교사 화면 ── */
export const TEACHER_VIEW = {
  /** 반 약한 키 히트맵: 최근 며칠 기록으로 볼지 */
  heatmapDays: 14,
  /** 상위 몇 개 키를 목록으로 보여 줄지 */
  heatmapTop: 10,
} as const;

/* ── 명예의 전당 (같은 학년, 닉네임만) ── */
export const HALL = {
  /** 부문마다 몇 명까지 */
  size: 10,
  /** 최고 타수 부문은 이 정확도(%) 이상인 기록만 */
  minAccuracy: 90,
  /** 기호 정확도 부문은 이만큼 이상 친 기록만 (짧은 글로 100% 받는 것 막기) */
  minKeystrokes: 60,
} as const;

/* ── 반 대결 (2주 단위, 월요일 시작) ── */
export const CLASS_BATTLE = {
  /** 첫 집계가 시작되는 월요일 (YYYY-MM-DD, 한국 시간). 여기서부터 14일씩 끊어요 */
  firstMonday: "2026-10-26",
  /** 1위 반 지갑 보너스 (같은 점수면 같이 1위) */
  winnerBonus: 300,
} as const;

/* ── 실력 티어 (개인 명예용, 트랙별) ── */
export const TIERS = ["bronze", "silver", "gold", "diamond", "master", "legend"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABELS: Record<Tier, string> = {
  bronze: "브론즈",
  silver: "실버",
  gold: "골드",
  diamond: "다이아",
  master: "마스터",
  legend: "레전드",
};

/* ── 연습 트랙 단계 (티어 6개 × 5단계 = 트랙마다 30단계) ── */
// 단계를 깨면 다음 단계가 열리고, 한 티어의 5단계를 다 깨면 그 트랙 티어가 올라가요.
// [글 난이도(연습팩 레벨 1~8), 목표 타수] — 시범 2주 뒤 데이터를 보고 숫자만 바꾸면 돼요.

export const STEPS_PER_TIER = 5;

type StagePlan = readonly (readonly [level: number, goalCpm: number])[];

export const STAGE_PLAN: Record<Track, StagePlan> = {
  korean: [
    [1, 40], [2, 50], [3, 60], [4, 70], [5, 80], // 브론즈
    [4, 95], [5, 110], [5, 120], [6, 130], [6, 140], // 실버
    [5, 155], [6, 170], [6, 185], [7, 200], [7, 210], // 골드
    [6, 225], [7, 240], [7, 255], [8, 270], [8, 280], // 다이아
    [6, 295], [7, 310], [8, 320], [8, 330], [8, 340], // 마스터
    [7, 355], [8, 370], [8, 380], [8, 390], [8, 400], // 레전드
  ],
  english: [
    [1, 30], [2, 40], [3, 50], [4, 55], [5, 60],
    [4, 70], [5, 80], [5, 90], [6, 95], [6, 100],
    [5, 110], [6, 120], [6, 130], [7, 140], [7, 150],
    [6, 160], [7, 170], [7, 180], [8, 190], [8, 200],
    [6, 210], [7, 220], [8, 230], [8, 240], [8, 250],
    [7, 260], [8, 270], [8, 280], [8, 290], [8, 300],
  ],
  symbol: [
    [1, 25], [2, 30], [3, 35], [4, 40], [5, 45],
    [3, 50], [4, 55], [5, 60], [6, 65], [6, 70],
    [5, 75], [6, 80], [7, 90], [7, 95], [8, 100],
    [6, 110], [7, 115], [7, 120], [8, 125], [8, 130],
    [6, 140], [7, 145], [8, 150], [8, 155], [8, 160],
    [7, 170], [8, 175], [8, 180], [8, 190], [8, 200],
  ],
  code: [
    [1, 25], [1, 30], [2, 35], [2, 40], [3, 45],
    [3, 50], [4, 55], [4, 60], [5, 65], [5, 70],
    [5, 75], [6, 80], [6, 85], [7, 90], [7, 95],
    [6, 100], [7, 105], [8, 110], [8, 115], [8, 120],
    [7, 130], [8, 135], [8, 140], [8, 145], [8, 150],
    [8, 160], [8, 165], [8, 170], [8, 175], [8, 180],
  ],
};

/** 단계 통과에 필요한 정확도(%) — 위 티어일수록 조금씩 높게 */
export const STAGE_ACCURACY: Record<Tier, number> = {
  bronze: 85,
  silver: 88,
  gold: 90,
  diamond: 92,
  master: 93,
  legend: 95,
};

/** 선생님 연습팩 기록의 레벨 값 (성장 점수 기준값을 선생님 연습끼리 비교) */
export const PACK_LEVEL = -100;
/** 코드 빈칸 채우기 기록의 레벨 값 */
export const BLANK_LEVEL = -200;
/** 파이썬 첫걸음 기록의 레벨 값 */
export const LESSON_LEVEL = -300;
/** 강의 통과에 필요한 정확도(%) */
export const LESSON_PASS_ACCURACY = 80;

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
  /** 배치 테스트 타수로 시작 단계를 정할 때 넘지 않는 단계 (11 = 골드 1단계) */
  maxStartStage: 11,
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

/** 혼자 하는 게임 이름 */
export type SoloGame = "rain" | "runner";
export const GAME_LABELS: Record<SoloGame, string> = { rain: "단어 비", runner: "토끼 달리기" };

/** 토끼 달리기: 앞에서 다가오는 장애물 단어를 쳐서 점프. 점수 계산은 단어 비와 같음 */
export const RUNNER = {
  level: -2,
  hearts: 3,
  maxSeconds: 150,
  /** 몇 개 넘을 때마다 빨라지는지 */
  hitsPerStage: 6,
  /** 장애물이 화면 오른쪽 끝에서 토끼까지 오는 시간(초): 처음 → 최소 */
  approachSeconds: { start: 7, min: 3, perStage: 0.6 },
  /** 장애물 사이 간격(초) */
  gapSeconds: { start: 2.6, min: 1.1, perStage: 0.25 },
} as const;

/** 보스전: 선생님 고스트와 레이스 */
export const BOSS = {
  level: -3,
  /** 이기려면 이 정확도 이상 */
  minAccuracy: 90,
} as const;

/** 친구 대결 (실시간 레이스) */
export const RACE = {
  level: -4,
  maxPlayers: 4,
  /** 시작 버튼을 누르고 실제로 시작하기까지 (카운트다운) */
  countdownMs: 3500,
  /** 진행률을 친구들에게 알리는 간격 */
  progressEveryMs: 200,
  /** 다 쳐야 등수, 정확도 이 값 이상 */
  minAccuracy: 80,
  /** 난이도 → 트랙별 글 난이도(연습팩 레벨) */
  difficulty: {
    easy: { korean: 4, english: 4, symbol: 3, code: 2 },
    normal: { korean: 5, english: 5, symbol: 5, code: 4 },
    hard: { korean: 6, english: 6, symbol: 7, code: 6 },
  },
  emojis: ["👍", "😮", "🔥", "👏", "😆", "💪"],
} as const;
export type RaceDifficulty = keyof typeof RACE.difficulty;

export const GAME_COINS = {
  /** 친구 대결 1등 */
  raceWin: 10,
  /** 보스 처음 이겼을 때 (개인 + 반 지갑) */
  bossWin: 20,
  bossClass: 5,
  /** 게임 한 판 */
  play: 3,
  /** 게임 최고 점수 갱신 */
  best: 10,
} as const;
