// 한글 음절 분해와 자모(키 입력) 계산. 화면과 무관한 순수 함수만 둡니다.

const SYLLABLE_START = 0xac00;
const SYLLABLE_END = 0xd7a3;

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const JUNG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
];
const JONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ", "ㅆ",
  "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** 두 번 눌러야 만들어지는 모음·받침 → 실제로 누르는 키 */
const COMPOUND: Record<string, string[]> = {
  ㅘ: ["ㅗ", "ㅏ"], ㅙ: ["ㅗ", "ㅐ"], ㅚ: ["ㅗ", "ㅣ"], ㅝ: ["ㅜ", "ㅓ"], ㅞ: ["ㅜ", "ㅔ"], ㅟ: ["ㅜ", "ㅣ"], ㅢ: ["ㅡ", "ㅣ"],
  ㄳ: ["ㄱ", "ㅅ"], ㄵ: ["ㄴ", "ㅈ"], ㄶ: ["ㄴ", "ㅎ"], ㄺ: ["ㄹ", "ㄱ"], ㄻ: ["ㄹ", "ㅁ"], ㄼ: ["ㄹ", "ㅂ"], ㄽ: ["ㄹ", "ㅅ"],
  ㄾ: ["ㄹ", "ㅌ"], ㄿ: ["ㄹ", "ㅍ"], ㅀ: ["ㄹ", "ㅎ"], ㅄ: ["ㅂ", "ㅅ"],
};

/** 두벌식 자모 → 영문 자판 위치 (키보드 히트맵용) */
export const JAMO_TO_KEY: Record<string, string> = {
  ㅂ: "q", ㅈ: "w", ㄷ: "e", ㄱ: "r", ㅅ: "t", ㅛ: "y", ㅕ: "u", ㅑ: "i", ㅐ: "o", ㅔ: "p",
  ㅁ: "a", ㄴ: "s", ㅇ: "d", ㄹ: "f", ㅎ: "g", ㅗ: "h", ㅓ: "j", ㅏ: "k", ㅣ: "l",
  ㅋ: "z", ㅌ: "x", ㅊ: "c", ㅍ: "v", ㅠ: "b", ㅜ: "n", ㅡ: "m",
  ㅃ: "Q", ㅉ: "W", ㄸ: "E", ㄲ: "R", ㅆ: "T", ㅒ: "O", ㅖ: "P",
};

export function isHangulSyllable(ch: string) {
  const c = ch.charCodeAt(0);
  return c >= SYLLABLE_START && c <= SYLLABLE_END;
}

/** 한글 자모(ㄱ, ㅏ 같은 낱자) */
export function isHangulJamo(ch: string) {
  const c = ch.charCodeAt(0);
  return c >= 0x3131 && c <= 0x318e;
}

export function isHangul(ch: string) {
  return isHangulSyllable(ch) || isHangulJamo(ch);
}

/** 음절을 초성·중성·종성으로. 한글이 아니면 null */
export function splitSyllable(ch: string): { cho: string; jung: string; jong: string } | null {
  if (!isHangulSyllable(ch)) return null;
  const offset = ch.charCodeAt(0) - SYLLABLE_START;
  return {
    cho: CHO[Math.floor(offset / 588)],
    jung: JUNG[Math.floor((offset % 588) / 28)],
    jong: JONG[offset % 28],
  };
}

/**
 * 글자 하나를 치기 위해 누르는 키 목록.
 * 한글은 자모로 나누고 겹모음·겹받침은 두 키로 셉니다. 그 밖의 글자는 그 글자 하나.
 */
export function toKeys(ch: string): string[] {
  const parts = splitSyllable(ch);
  if (!parts) return [ch];
  return [parts.cho, parts.jung, parts.jong]
    .filter(Boolean)
    .flatMap((j) => COMPOUND[j] ?? [j]);
}

/** 자모(키 입력) 기준 타수 */
export function countKeystrokes(text: string): number {
  let n = 0;
  for (const ch of text) n += toKeys(ch).length;
  return n;
}

/**
 * 조합 중인 글자(typed)가 목표 글자(target)로 가는 중인지.
 * 예: 목표 "닭"에 대해 "다", "달"은 가는 중. "도"는 아님.
 */
export function isPrefixOf(typed: string, target: string): boolean {
  const a = toKeys(typed);
  const b = toKeys(target);
  if (a.length > b.length) return false;
  return a.every((k, i) => k === b[i]);
}

/**
 * 틀린 글자에서 학생이 놓친 키 하나를 고릅니다(약한 키 분석용).
 * 한글은 처음으로 어긋난 자모, 그 밖에는 목표 글자 자체.
 */
export function missedKey(target: string, typed: string): string {
  const want = toKeys(target);
  const got = toKeys(typed);
  const i = want.findIndex((k, idx) => k !== got[idx]);
  return want[i === -1 ? 0 : i];
}
