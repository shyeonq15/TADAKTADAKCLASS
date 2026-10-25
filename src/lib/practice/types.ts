// 연습 기록·진행 상황 타입. 서버와 화면이 같이 씁니다.

import type { Track } from "@/config/game";
import type { PracticeMode } from "@/data/packs";
import type { IntegrityFlag } from "@/lib/typing/integrity";

export type AttemptKind = "practice" | "mission" | "weak" | "placement";

export type Attempt = {
  id: string;
  kind: AttemptKind;
  track: Track;
  level: number;
  mode: PracticeMode | "weak" | "placement";
  cpm: number;
  accuracy: number;
  keystrokes: number;
  durationMs: number;
  missedKeys: Record<string, number>;
  flags: IntegrityFlag[];
  suspicious: boolean;
  at: number;
};

export type CoinEntry = { at: number; amount: number; reason: string };

export type Progress = {
  /** 트랙별로 열린 가장 높은 레벨 */
  unlocked: Record<Track, number>;
  /** 통과한 레벨 "korean-1" */
  cleared: string[];
  /** 배치 테스트 타수. 안 했으면 null */
  placement: Record<Track, number> | null;
  coins: number;
  /** 내가 반 지갑에 보탠 코인 */
  classCoins: number;
  coinLog: CoinEntry[];
  /** 레벨 첫 통과 기록 (성장 점수 "레벨 첫 클리어"용) */
  clearLog: { id: string; at: number }[];
  /** 미션 완료한 날짜 YYYY-MM-DD (한국 시간) */
  missionDays: string[];
};

export type PracticeData = { attempts: Attempt[]; progress: Progress };

export const EMPTY_DATA: PracticeData = {
  attempts: [],
  progress: {
    unlocked: { korean: 1, english: 1, symbol: 1, code: 1 },
    cleared: [],
    placement: null,
    coins: 0,
    classCoins: 0,
    coinLog: [],
    clearLog: [],
    missionDays: [],
  },
};

export type SaveResult = {
  attempt: Attempt;
  /** 같은 트랙·레벨 최근 5회 중앙값 (이번 기록 전) */
  before: { cpm: number; accuracy: number } | null;
  personalBest: boolean;
  cleared: boolean;
  firstClear: boolean;
  unlockedLevel: number | null;
  coins: number;
};

/** 한 판을 시작할 때 서버에 보내는 요청 */
export type RoundRequest =
  | { kind: "practice"; track: Track; level: number }
  | { kind: "weak"; track: Track }
  | { kind: "mission"; track: Track; level: number; weak?: boolean }
  | { kind: "placement"; track: Track };

/** 서버가 내준 지문 + 서명된 표 */
export type IssuedRound = { lines: string[]; token: string };

/** 한 판이 끝나고 서버로 보내는 내용. 타수·정확도는 서버가 다시 계산합니다. */
export type RoundSubmission = {
  token: string;
  lines: string[];
  typedLines: string[];
  durationMs: number;
  totalErrors: number;
  totalCommitted: number;
  missedKeys: Record<string, number>;
  keyTimes: number[];
};
