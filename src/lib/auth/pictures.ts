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

/**
 * 너무 쉬운 그림 비밀번호: 친구가 몇 번만 눌러 봐도 맞힐 수 있어서 못 쓰게 해요.
 *  · 같은 그림을 3번 이상 (🐰🐰🐰🐰, 🐰🐰🐰🍎)
 *  · 두 그림 번갈아 (🐰🍎🐰🍎) 또는 두 그림씩 (🐰🐰🍎🍎)
 *  · 키패드에서 차례대로 붙은 그림 (토끼→고양이→강아지→곰, 거꾸로도)
 */
export function weakSecretReason(s: string): string | null {
  if (!isValidSecret(s)) return null;
  const p = s.split("-").map(Number);
  const counts = new Map<number, number>();
  for (const x of p) counts.set(x, (counts.get(x) ?? 0) + 1);
  if (Math.max(...counts.values()) >= 3) return "같은 그림을 3번 이상 쓰면 친구가 쉽게 맞혀요.";
  if (counts.size === 2 && Math.max(...counts.values()) === 2) return "그림 두 개만 반복하면 친구가 쉽게 맞혀요.";
  const steps = p.slice(1).map((x, i) => x - p[i]);
  if (steps.every((d) => d === 1) || steps.every((d) => d === -1)) return "차례대로 붙은 그림은 친구가 쉽게 맞혀요.";
  return null;
}

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
