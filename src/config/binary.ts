// 이진수 연습실 (2026-11-02, 교사 활동지를 옮김). 단계마다 문제 수·비트 수를 여기서 바꿔요.

export type BinaryStageKind =
  /** 이진수를 보고 십진수 쓰기 */
  | "toDec"
  /** 목표 십진수에 맞게 비트 칸을 눌러 0↔1 바꾸기 */
  | "flip"
  /** 십진수를 보고 이진수 쓰기 */
  | "toBin"
  /** 위 두 가지 섞기 */
  | "mixed";

export type BinaryStage = {
  n: number;
  title: string;
  kind: BinaryStageKind;
  bits: number;
  count: number;
  /** 자릿값(8 4 2 1)을 위에 보여 줄지 */
  showPlaces: boolean;
};

export const BINARY_STAGES: readonly BinaryStage[] = [
  { n: 1, title: "4비트 → 십진수", kind: "toDec", bits: 4, count: 6, showPlaces: true },
  { n: 2, title: "5비트 → 십진수", kind: "toDec", bits: 5, count: 6, showPlaces: true },
  { n: 3, title: "비트를 눌러 숫자 만들기", kind: "flip", bits: 8, count: 3, showPlaces: true },
  { n: 4, title: "8비트 → 십진수", kind: "toDec", bits: 8, count: 4, showPlaces: false },
  { n: 5, title: "십진수 → 이진수 쓰기", kind: "toBin", bits: 8, count: 4, showPlaces: false },
  { n: 6, title: "섞어서 도전", kind: "mixed", bits: 8, count: 6, showPlaces: false },
];

/** 단계를 처음 깰 때 코인 (다시 깨면 없음) */
export const BINARY_FIRST_CLEAR_COINS = 5;
