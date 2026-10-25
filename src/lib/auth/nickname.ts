// 닉네임 규칙: 학생끼리 보이는 유일한 이름이라 실명·욕설을 거릅니다.

const BANNED = ["시발", "씨발", "병신", "개새", "존나", "좆", "fuck", "shit", "바보", "멍청"];

export function checkNickname(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 12) return { ok: false, message: "닉네임은 2~12글자로 정해 주세요." };
  if (!/^[가-힣a-zA-Z0-9_ ]+$/.test(value)) return { ok: false, message: "한글, 영어, 숫자, _ 만 쓸 수 있어요." };
  const lower = value.toLowerCase().replace(/\s/g, "");
  if (BANNED.some((w) => lower.includes(w))) return { ok: false, message: "친구가 기분 좋을 닉네임으로 바꿔 볼까요?" };
  return { ok: true, value };
}
