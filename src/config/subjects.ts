// 교과 탐험 과목·별 기준 (2026-11-02). 과목을 더하려면 SUBJECTS 에 한 줄만 추가하면 돼요.

import type { Track } from "./game";

export type Subject = { id: string; label: string; icon: string; track: Track };

export const SUBJECTS: readonly Subject[] = [
  { id: "korean-lang", label: "국어", icon: "📖", track: "korean" },
  { id: "english", label: "영어", icon: "🔤", track: "english" },
  { id: "social", label: "사회", icon: "🌏", track: "korean" },
  { id: "history", label: "역사", icon: "🏯", track: "korean" },
  { id: "science", label: "과학", icon: "🔬", track: "korean" },
  { id: "ethics", label: "도덕", icon: "💗", track: "korean" },
  { id: "tech", label: "기술·가정", icon: "🔧", track: "korean" },
  { id: "info", label: "정보", icon: "💻", track: "korean" },
];

export const subjectOf = (id: string | null | undefined) => SUBJECTS.find((s) => s.id === id);

/**
 * 지문 별 기준: 타수는 "내 평소 타수"(같은 트랙 최근 단계 판의 가운데 값)와 비교해서, 느린 친구도 ★3을 받을 수 있어요.
 * 평소 기록이 아직 없으면 정확도만 봐요.
 */
export const EXPLORE_STARS = {
  one: { accuracy: 85 },
  two: { accuracy: 90, speed: 0.9 },
  three: { accuracy: 95, speed: 1.0 },
} as const;

export function starsFor(accuracy: number, cpm: number, baseline: number | null): number {
  const fast = (ratio: number) => baseline === null || cpm >= baseline * ratio;
  if (accuracy >= EXPLORE_STARS.three.accuracy && fast(EXPLORE_STARS.three.speed)) return 3;
  if (accuracy >= EXPLORE_STARS.two.accuracy && fast(EXPLORE_STARS.two.speed)) return 2;
  if (accuracy >= EXPLORE_STARS.one.accuracy) return 1;
  return 0;
}
