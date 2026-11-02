// 문제형 단어 비 (비트 해독기·입출력 레이스): 단어 하나 = "문제\t답". 화면에는 문제가 떨어지고, 답을 쳐서 터뜨려요.
// 서버와 화면이 같이 써요. 단어 순서는 시드로 정해서 서버가 다시 만들 수 있어요.

import { seededRandom } from "./rain";

/** 문제·답 나누기 (탭이 없으면 보이는 것 = 칠 것) */
export function quizParts(word: string): { show: string; answer: string } {
  const i = word.indexOf("\t");
  return i < 0 ? { show: word, answer: word } : { show: word.slice(0, i), answer: word.slice(i + 1) };
}

const bin = (n: number, bits: number) => n.toString(2).padStart(bits, "0");

/**
 * 비트 비 문제 순서 (이진수 연습실 다음 단계로, 쉽게 시작해요)
 *  · 처음 20개: 4비트 이진수 → 십진수
 *  · 다음 20개: 4비트 섞기 (십진수 → 이진수도)
 *  · 그다음: 5비트 섞기, 가끔 6비트
 */
export function bitsSequence(seed: number, count = 240): string[] {
  const rand = seededRandom(seed);
  const int = (n: number) => Math.floor(rand() * n);
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    const bits = k < 40 ? 4 : k < 80 || rand() < 0.7 ? 5 : 6;
    const n = 1 + int(2 ** bits - 1);
    const toDec = k < 20 || rand() < 0.6;
    out.push(toDec ? `${bin(n, bits)}₂ = ?\t${n}` : `${n} = ?₂\t${bin(n, bits)}`);
  }
  return out;
}
