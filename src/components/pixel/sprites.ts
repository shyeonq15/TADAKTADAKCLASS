import type { Sprite } from "./PixelSprite";

// 임시 픽셀 그림 (정식 그래픽 전까지 사용). K = 외곽선

const OUTLINE = "#22243a";

export const BUNNY: Sprite = {
  rows: [
    "..KK..KK........",
    ".KWWK.KWK.......",
    ".KWWK.KWK.......",
    ".KWPK.KPK.......",
    "..KWWKWWK.......",
    ".KWWWWWWWKKKKK..",
    "KWWKWWWWWWWWWWK.",
    "KWWWWWWWWWWWWWWK",
    "KPPWWWWWWWWWWWWK",
    ".KWWWWWWWWWWWWK.",
    "..KWWKKKKKKWWK..",
    "...KK......KK...",
  ],
  palette: { K: OUTLINE, W: "#fff6d6", P: "#ff9cc8" },
};

export const CLOUD: Sprite = {
  rows: [
    ".......WWWW.........",
    ".....WWWWWWWW.......",
    "....WWWWWWWWWW.WWW..",
    "..WWWWWWWWWWWWWWWWW.",
    ".WWWWWWWWWWWWWWWWWWW",
    "WWWWWWWWWWWWWWWWWWWW",
    "BBWWWWWWWWWWWWWWWWBB",
    ".BBBBBWWWWWWWWBBBBB.",
  ],
  palette: { W: "#ffffff", B: "#ddf2ff" },
};

export const SPARKLE: Sprite = {
  rows: ["..G..", "..G..", "GGGGG", "..G..", "..G.."],
  palette: { G: "#b6f05a" },
};

export const BALLOON: Sprite = {
  rows: [
    "...KKKK...",
    "..KGGGGK..",
    ".KGLGGGGK.",
    "KGLLGGGGGK",
    "KGLGGGGGGK",
    "KGGGGGGGGK",
    "KGGGGGGGGK",
    ".KGGGGGGK.",
    "..KGGGGK..",
    "...KGGK...",
    "....KK....",
    "....K.....",
    ".....K....",
    "....K.....",
    ".....K....",
    "....K.....",
  ],
  palette: { K: "#2e6b14", G: "#b6f05a", L: "#e4ffb0" },
};

export const SPEECH: Sprite = {
  rows: [
    ".KKKKKKKKKKKK.",
    "KWWWWWWWWWWWWK",
    "KWWWWWWWWWWWWK",
    "KWWKWWKWWKWWWK",
    "KWWWWWWWWWWWWK",
    ".KKKKWKKKKKKK.",
    "....KWK.......",
    "....KK........",
  ],
  palette: { K: OUTLINE, W: "#ffffff" },
};

export const HEART: Sprite = {
  rows: [
    ".KK...KK.",
    "KRRK.KRRK",
    "KRWRKRRRK",
    "KRRRRRRRK",
    ".KRRRRRK.",
    "..KRRRK..",
    "...KRK...",
    "....K....",
  ],
  palette: { K: OUTLINE, R: "#2e7cf6", W: "#a6caf0" },
};

export const SMILEY: Sprite = {
  rows: [
    "...KKKKKK...",
    "..KYYYYYYK..",
    ".KYYYYYYYYK.",
    "KYYKYYYYKYYK",
    "KYYKYYYYKYYK",
    "KYYYYYYYYYYK",
    "KYKYYYYYYKYK",
    "KYYKYYYYKYYK",
    ".KYYKKKKYYK.",
    "..KYYYYYYK..",
    "...KKKKKK...",
  ],
  palette: { K: OUTLINE, Y: "#ffd84d" },
};

export const NOTE: Sprite = {
  rows: [
    "....KKKKKK",
    "....KKKKKK",
    "....K....K",
    "....K....K",
    "....K....K",
    "....K....K",
    "..KKK..KKK",
    ".KKKK.KKKK",
    ".KKKK.KKKK",
    "..KK...KK.",
  ],
  palette: { K: "#111111" },
};

export const FOLDER: Sprite = {
  rows: [
    "KKKKK...........",
    "KLLLLK..........",
    "KLLLLLKKKKKKKKK.",
    "KLLLLLLLLLLLLLLK",
    "KBBBBBBBBBBBBBBK",
    "KBWBBBBBBBBBBBBK",
    "KBBBBBBBBBBBBBBK",
    "KBBBBBBBBBBBBBBK",
    "KBBBBBBBBBBBBBBK",
    "KBBBBBBBBBBBBBBK",
    "KKKKKKKKKKKKKKKK",
  ],
  palette: { K: OUTLINE, L: "#6fb3ff", B: "#2e7cf6", W: "#a6caf0" },
};

export const THUMBS: Sprite = {
  rows: [
    "....KK......",
    "...KWK......",
    "...KWK......",
    "..KWWK......",
    "KKKWWWKKKKK.",
    "KBKWWWWWWWWK",
    "KBKWWWWWKKK.",
    "KBKWWWWWWWWK",
    "KBKWWWWWKKK.",
    "KBKWWWWWWWK.",
    "KKKKKKKKKK..",
  ],
  palette: { K: OUTLINE, W: "#ffffff", B: "#2e7cf6" },
};

export const COIN: Sprite = {
  rows: [
    "..KKKK..",
    ".KYYYYK.",
    "KYYWYYOK",
    "KYWYYYOK",
    "KYYYYYOK",
    "KYYYYOOK",
    ".KOOOOK.",
    "..KKKK..",
  ],
  palette: { K: OUTLINE, Y: "#ffd84d", W: "#fff6d6", O: "#e0a52a" },
};

/** CRT 화면 안쪽용: 하늘색 단색 구름 */
export const CLOUD_PALE: Sprite = {
  rows: CLOUD.rows,
  palette: { W: "#eef6ff", B: "#cfe4fb" },
};
