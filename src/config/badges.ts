// 칭호·뱃지 (모으는 재미). 등수가 아니라 "해냈다"를 모아요 — 느린 친구도 다 모을 수 있게.
// 조건 숫자는 여기서만 바꿔요. 계산은 서버(src/lib/badges/server.ts)가 기록을 읽어서 해요.

import { TIERS, type Tier, type Track } from "@/config/game";

export type BadgeStats = {
  /** 가장 길게 이어서 연습한 날 수 (지금 끊겼어도 최고 기록) */
  maxStreak: number;
  /** 연습·미션 판 수 */
  rounds: number;
  /** 정확도 100% 판 (60타 이상) 이 있었는지 */
  perfect: boolean;
  /** 오늘의 미션 완료한 날 수 */
  missions: number;
  lessonsDone: number;
  lessonCount: number;
  bossDefeated: number;
  bossTier: Tier | null;
  tiers: Record<Track, Tier>;
  /** 게임 판 수 (단어 비·토끼 달리기) */
  games: number;
  /** 친구 대결 시리즈 우승 수 */
  raceWins: number;
  /** 건의함에 보낸 글이 "반영했어요!" 가 된 수 */
  feedbackDone: number;
  /** 시즌 완주 수 (시즌 안에 FINISH_DAYS 일 이상 연습) */
  seasonsFinished: number;
  /** 교과 탐험: 모은 별, 모든 지문을 ★1 이상 깬 단원 수 */
  exploreStars: number;
  exploreUnits: number;
};

export type Badge = { id: string; icon: string; name: string; how: string; check: (s: BadgeStats) => boolean };

const atLeast = (t: Tier | null, min: Tier) => t !== null && TIERS.indexOf(t) >= TIERS.indexOf(min);
const allAtLeast = (s: BadgeStats, min: Tier) => Object.values(s.tiers).every((t) => atLeast(t, min));

/** 시즌 완주: 한 시즌(2주) 안에 이만큼 이상 연습한 날이 있으면 */
export const SEASON_FINISH_DAYS = 5;

export const BADGES: readonly Badge[] = [
  // 꾸준함
  { id: "first-step", icon: "🐣", name: "첫걸음", how: "연습 1판 하기", check: (s) => s.rounds >= 1 },
  { id: "streak-3", icon: "🔥", name: "3일 연속", how: "3일 이어서 연습하기", check: (s) => s.maxStreak >= 3 },
  { id: "streak-7", icon: "🔥", name: "7일 연속", how: "7일 이어서 연습하기", check: (s) => s.maxStreak >= 7 },
  { id: "streak-14", icon: "🌋", name: "14일 연속", how: "14일 이어서 연습하기", check: (s) => s.maxStreak >= 14 },
  { id: "rounds-50", icon: "⌨️", name: "타닥타닥 50판", how: "연습 50판 하기", check: (s) => s.rounds >= 50 },
  { id: "rounds-200", icon: "💯", name: "타닥타닥 200판", how: "연습 200판 하기", check: (s) => s.rounds >= 200 },
  { id: "mission-10", icon: "📅", name: "미션 10일", how: "오늘의 미션 10일 완료", check: (s) => s.missions >= 10 },
  { id: "season-1", icon: "🏁", name: "시즌 완주", how: `한 시즌(2주)에 ${SEASON_FINISH_DAYS}일 이상 연습하기`, check: (s) => s.seasonsFinished >= 1 },
  { id: "season-3", icon: "🎖️", name: "시즌 3번 완주", how: "시즌 3번 완주하기", check: (s) => s.seasonsFinished >= 3 },
  // 정확함
  { id: "perfect", icon: "🎯", name: "백발백중", how: "60타 이상 친 판에서 정확도 100%", check: (s) => s.perfect },
  // 배움
  { id: "lesson-10", icon: "📘", name: "파이썬 10강", how: "파이썬 첫걸음 10강 통과", check: (s) => s.lessonsDone >= 10 },
  { id: "lesson-all", icon: "🎓", name: "파이썬 졸업", how: "파이썬 첫걸음 모든 강 통과", check: (s) => s.lessonCount > 0 && s.lessonsDone >= s.lessonCount },
  // 교과 탐험
  { id: "explorer", icon: "🧭", name: "교과 탐험가", how: "교과 탐험 한 단원 모든 지문 깨기", check: (s) => s.exploreUnits >= 1 },
  { id: "explorer-5", icon: "🗺️", name: "탐험 대장", how: "교과 탐험 5단원 깨기", check: (s) => s.exploreUnits >= 5 },
  { id: "star-30", icon: "🌟", name: "별 30개", how: "교과 탐험 별 30개 모으기", check: (s) => s.exploreStars >= 30 },
  // 티어
  { id: "all-silver", icon: "◆", name: "네 트랙 실버", how: "네 트랙 모두 실버 이상", check: (s) => allAtLeast(s, "silver") },
  { id: "all-gold", icon: "♛", name: "네 트랙 골드", how: "네 트랙 모두 골드 이상", check: (s) => allAtLeast(s, "gold") },
  { id: "all-legend", icon: "👑", name: "올 레전드", how: "네 트랙 모두 레전드", check: (s) => allAtLeast(s, "legend") },
  { id: "grandmaster", icon: "🌌", name: "그랜드마스터", how: "한 트랙이라도 그랜드마스터", check: (s) => Object.values(s.tiers).some((t) => atLeast(t, "grandmaster")) },
  // 게임·보스·대결
  { id: "gamer-20", icon: "🎮", name: "게이머", how: "게임 20판 하기", check: (s) => s.games >= 20 },
  { id: "boss-1", icon: "👾", name: "보스 사냥꾼", how: "보스 1마리 격파", check: (s) => s.bossDefeated >= 1 },
  { id: "boss-10", icon: "⚔️", name: "보스 10마리", how: "보스 10마리 격파", check: (s) => s.bossDefeated >= 10 },
  { id: "boss-diamond", icon: "💎", name: "다이아 보스 격파", how: "다이아 이상 보스 격파", check: (s) => atLeast(s.bossTier, "diamond") },
  { id: "race-win", icon: "🏆", name: "첫 우승", how: "친구 대결 시리즈 우승", check: (s) => s.raceWins >= 1 },
  // 함께 만들기
  { id: "qa-crew", icon: "🐞", name: "QA크루", how: "건의함에 보낸 글이 반영되기", check: (s) => s.feedbackDone >= 1 },
];

export const badge = (id: string) => BADGES.find((b) => b.id === id);
export const earnedBadges = (s: BadgeStats) => BADGES.filter((b) => b.check(s)).map((b) => b.id);
