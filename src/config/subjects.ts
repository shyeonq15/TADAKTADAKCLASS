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
 * 평소 기록이 아직 없으면 정확도만 보고, ★★★는 평소 기록이 생긴 뒤에만 받을 수 있어요.
 * (2026-11-04 교사 결정: ★★★는 여러 번 연습해야 받을 만큼 어렵게)
 */
export const EXPLORE_STARS = {
  one: { accuracy: 85 },
  two: { accuracy: 95, speed: 1.0 },
  three: { accuracy: 98, speed: 1.15 },
} as const;

export function starsFor(accuracy: number, cpm: number, baseline: number | null): number {
  const fast = (ratio: number) => baseline === null || cpm >= baseline * ratio;
  if (baseline !== null && accuracy >= EXPLORE_STARS.three.accuracy && fast(EXPLORE_STARS.three.speed)) return 3;
  if (accuracy >= EXPLORE_STARS.two.accuracy && fast(EXPLORE_STARS.two.speed)) return 2;
  if (accuracy >= EXPLORE_STARS.one.accuracy) return 1;
  return 0;
}

/** 교과 탐험 과목 탭에 함께 보여 주는 활동 (지문 치기 말고, 그 과목을 연습하는 화면) */
export type SubjectActivity = { href: string; icon: string; title: string; desc: string };

export const SUBJECT_ACTIVITIES: Readonly<Record<string, readonly SubjectActivity[]>> = {
  info: [
    { href: "/binary", icon: "🔢", title: "이진수 연습실", desc: "자릿값 보며 십진수 쓰기 → 비트 눌러 만들기 (6단계)" },
    { href: "/sensors", icon: "🔌", title: "센서·액추에이터 분류", desc: "아날로그 입력? 디지털 출력? 부품을 보고 골라요" },
    { href: "/pixel", icon: "🖼️", title: "0과 1 픽셀 아트", desc: "숫자로 그림을 그려 우리 반 갤러리에 걸어요" },
    { href: "/adc", icon: "〰️", title: "아날로그 → 디지털", desc: "소리 곡선을 숫자로 바꿔 듣기 (표본화·양자화)" },
  ],
  social: [
    { href: "/cases/election", icon: "🗳️", title: "선거 원칙 지킴이", desc: "사례를 보고 어긴 원칙 고르기 (보통·평등·직접·비밀)" },
    { href: "/cases/democracy", icon: "🏛️", title: "민주주의 원리 찾기", desc: "국민 주권·국민 자치·입헌주의·권력 분립" },
  ],
  english: [
    { href: "/vocab", icon: "🌧️", title: "영단어 연구소", desc: "뜻 비 · 빈칸 채우기 · 듣고 쓰기 · 틀린 단어장 (301~1000번)" },
    { href: "/dictation", icon: "🎧", title: "영어 받아쓰기", desc: "교과서 본문 문장을 듣고 그대로 쳐요" },
  ],
};

export const activitiesOf = (subjectId: string) => SUBJECT_ACTIVITIES[subjectId] ?? [];

/**
 * 과목 랭킹 (2026-11-04 교사 결정, CLAUDE.md 6장 예외): 같은 학년 안에서 닉네임으로만, 과목 탭마다 하나.
 * subject: 과목 랭킹 인원
 */
export const EXPLORE_RANK = { subject: 10 } as const;

/**
 * 과목 점수 (실력·성장·노력을 하나로): 별 × star + 기록 갱신 × improve + 연습한 날 × day
 *  · 별: 지문 별, 퀴즈 별, 영단어 묶음 단계(단어장·빈칸·듣기 한 단계 = 별 1개)
 *  · 기록 갱신: 같은 지문을 다시 쳐서 내 최고 타수를 넘을 때마다
 *  · 연습한 날: 그 과목을 연습한 날 수
 */
export const SUBJECT_POINTS = { star: 10, improve: 5, day: 5 } as const;

/** 퀴즈 별: 처음에 맞힌 비율로 (끝까지 하면 ★1) */
export const QUIZ_STARS = { three: 0.95, two: 0.8 } as const;
export function quizStars(score: number, total: number) {
  if (total <= 0) return 0;
  const r = score / total;
  return r >= QUIZ_STARS.three ? 3 : r >= QUIZ_STARS.two ? 2 : 1;
}
