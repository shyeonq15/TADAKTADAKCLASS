// 그림 비밀번호: 12개 그림 중 4개를 순서대로 고름 (12⁴ = 20,736가지)
// 학생이 직접 정하고, 서버에는 그림 순서를 그대로 저장하지 않습니다 (pinPassword로 섞어서 저장).

export const PICTURES = [
  { emoji: "🐰", name: "토끼" },
  { emoji: "🐱", name: "고양이" },
  { emoji: "🐶", name: "강아지" },
  { emoji: "🐻", name: "곰" },
  { emoji: "🍎", name: "사과" },
  { emoji: "🍓", name: "딸기" },
  { emoji: "🍌", name: "바나나" },
  { emoji: "⭐", name: "별" },
  { emoji: "🌙", name: "달" },
  { emoji: "☀️", name: "해" },
  { emoji: "🌸", name: "꽃" },
  { emoji: "🎈", name: "풍선" },
] as const;

export const SECRET_LENGTH = 4;

/** 고른 그림 번호들 → 서버로 보내는 문자열 "0-7-3-11" */
export const encodeSecret = (picks: readonly number[]) => picks.join("-");

export function isValidSecret(s: string) {
  const parts = s.split("-");
  return parts.length === SECRET_LENGTH && parts.every((p) => /^\d{1,2}$/.test(p) && Number(p) < PICTURES.length);
}

/**
 * 학번 → 학년·반·번호. 5자리(10307 = 1학년 03반 07번) 또는 4자리(1307 = 1학년 3반 07번)
 */
export function parseStudentNo(raw: string): { grade: number; classNo: number; number: number } | null {
  const s = raw.trim();
  const m = s.match(/^(\d)(\d{1,2})(\d{2})$/);
  if (!m) return null;
  const grade = Number(m[1]);
  const classNo = Number(m[2]);
  const number = Number(m[3]);
  if (grade < 1 || grade > 6 || classNo < 1 || classNo > 30 || number < 1 || number > 50) return null;
  return { grade, classNo, number };
}
