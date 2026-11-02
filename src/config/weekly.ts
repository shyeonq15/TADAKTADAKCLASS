// 주간 챌린지 (2026-11-02): 월요일마다 아래 목록에서 3개가 골라져요. 숫자·보상은 여기서만 바꿔요.

import type { Track } from "./game";

export const WEEKLY = {
  /** 한 주에 나오는 챌린지 수 */
  perWeek: 3,
  /** 챌린지 하나 보상 코인 */
  reward: 15,
} as const;

/** 이번 주 기록 요약 (서버가 기록을 세서 만들어요) */
export type WeekStats = {
  rounds: number;
  acc95: number;
  perfect: number;
  days: number;
  games: number;
  explore: number;
  byTrack: Record<Track, number>;
};

export type Challenge = { id: string; icon: string; title: string; goal: number; count: (s: WeekStats) => number };

export const CHALLENGES: readonly Challenge[] = [
  { id: "rounds-15", icon: "⌨️", title: "연습 15판 하기", goal: 15, count: (s) => s.rounds },
  { id: "acc95-5", icon: "🎯", title: "정확도 95% 이상 5판", goal: 5, count: (s) => s.acc95 },
  { id: "perfect-1", icon: "💯", title: "정확도 100% 한 판 (60타 이상)", goal: 1, count: (s) => s.perfect },
  { id: "days-4", icon: "📅", title: "이번 주 4일 연습하기", goal: 4, count: (s) => s.days },
  { id: "games-8", icon: "🎮", title: "게임 8판 하기", goal: 8, count: (s) => s.games },
  { id: "explore-5", icon: "🧭", title: "교과 탐험 지문 5개 치기", goal: 5, count: (s) => s.explore },
  { id: "symbol-5", icon: "{ }", title: "기호 트랙 5판", goal: 5, count: (s) => s.byTrack.symbol },
  { id: "code-5", icon: "</>", title: "코드 트랙 5판", goal: 5, count: (s) => s.byTrack.code },
  { id: "english-5", icon: "🔤", title: "영타 트랙 5판", goal: 5, count: (s) => s.byTrack.english },
  { id: "korean-5", icon: "가", title: "한글 트랙 5판", goal: 5, count: (s) => s.byTrack.korean },
];

/** 이번 주 챌린지: 주 번호로 정해져서 모두에게 같아요 */
export function challengesOfWeek(weekStart: string): Challenge[] {
  const week = Math.floor(Date.parse(`${weekStart}T00:00:00Z`) / (7 * 86400000));
  const picked: Challenge[] = [];
  let k = week * 7;
  while (picked.length < WEEKLY.perWeek) {
    const c = CHALLENGES[((k % CHALLENGES.length) + CHALLENGES.length) % CHALLENGES.length];
    if (!picked.includes(c)) picked.push(c);
    k += 3;
  }
  return picked;
}
