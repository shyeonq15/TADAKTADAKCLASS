// 이진 코드로 비트맵 그리기 (교사 활동지를 옮김). 한 칸 = 한 픽셀, 색 번호를 이진수로 저장해요.
//  · 1비트: 2가지 색 (0, 1)
//  · 2비트: 4가지 색 (00 ~ 11)
//  · 4비트: 16가지 색 (0000 ~ 1111) — 활동지 색표
// 그림은 줄마다 칸 수만큼 글자(색 번호를 16진수 한 글자: 0~9, a~f)로 저장해요.

export type PixelBits = 1 | 2 | 4;

/** 자유 그리기 칸 수 (16×16), 해독 문제 칸 수 (8×8) */
export const PIXEL_SIZE = 16;
export const PUZZLE_SIZE = 8;

export const PIXEL_PALETTES: Record<PixelBits, string[]> = {
  1: ["#ffffff", "#22243a"],
  2: ["#ffffff", "#ff7ab6", "#3b6fe0", "#22243a"],
  // 활동지 색표: 0 흰색 ~ 7 연한 색, 8 검정 ~ 15 진한 색
  4: [
    "#ffffff", "#9fc5e8", "#ea9999", "#ffe599", "#b6d7a8", "#f9cb9c", "#a2c4c9", "#b4a7d6",
    "#000000", "#4a86e8", "#e53935", "#fbbc04", "#34a853", "#ff6d01", "#783f04", "#9900ff",
  ],
};

/** 색 번호 → 이진 코드 ("0110") */
export const codeOf = (n: number, bits: PixelBits) => n.toString(2).padStart(bits, "0");

/** 한 학생이 하루에 걸 수 있는 그림 수, 반 갤러리에 보이는 수 */
export const PIXEL_LIMITS = { perDay: 5, gallery: 30 } as const;

/** 해독 문제: 이진 코드를 보고 칸을 색칠해요 (8×8). rows 는 색 번호(16진수 한 글자) */
export type PixelPuzzle = { id: string; name: string; bits: PixelBits; rows: string[] };

export const PIXEL_PUZZLES: readonly PixelPuzzle[] = [
  {
    id: "heart",
    name: "하트",
    bits: 1,
    rows: ["00000000", "01100110", "11111111", "11111111", "01111110", "00111100", "00011000", "00000000"],
  },
  {
    id: "smile",
    name: "웃는 얼굴",
    bits: 1,
    rows: ["00111100", "01000010", "10100101", "10000001", "10100101", "10011001", "01000010", "00111100"],
  },
  {
    id: "rabbit",
    name: "토끼",
    bits: 2,
    rows: ["03000300", "03100310", "03100310", "03333330", "33033033", "33311333", "03322330", "00333300"],
  },
  {
    id: "mushroom",
    name: "버섯",
    bits: 2,
    rows: ["00111100", "01121110", "11111121", "12111111", "00333300", "00303300", "00333300", "00000000"],
  },
  {
    id: "flower",
    name: "꽃",
    bits: 4,
    rows: ["00aa0aa0", "0aaaaaaa", "0aabbaaa", "00aaaaa0", "000cc000", "0c0cc0c0", "00cccc00", "00ee0000"],
  },
  {
    id: "rainbow",
    name: "무지개",
    bits: 4,
    rows: ["00000000", "00aaaa00", "0adddda0", "adbbbbda", "adbccbda", "adbc9bda", "adbc9bda", "00000000"],
  },
];

/** 그림이 올바른지: size줄, 줄마다 size칸, 그 비트로 쓸 수 있는 색 번호만 */
export function validPixelRows(rows: unknown, bits: PixelBits, size = PIXEL_SIZE): rows is string[] {
  const allowed = bits === 1 ? `^[01]{${size}}$` : bits === 2 ? `^[0-3]{${size}}$` : `^[0-9a-f]{${size}}$`;
  const re = new RegExp(allowed);
  return Array.isArray(rows) && rows.length === size && rows.every((r) => typeof r === "string" && re.test(r));
}
