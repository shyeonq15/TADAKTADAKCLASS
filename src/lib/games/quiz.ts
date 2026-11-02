// 문제형 단어 비 (비트 해독기·입출력 레이스): 단어 하나 = "문제\t답". 화면에는 문제가 떨어지고, 답을 쳐서 터뜨려요.
// 서버와 화면이 같이 써요. 단어 순서는 시드로 정해서 서버가 다시 만들 수 있어요.

import { seededRandom } from "./rain";

/** 문제·답 나누기 (탭이 없으면 보이는 것 = 칠 것) */
export function quizParts(word: string): { show: string; answer: string } {
  const i = word.indexOf("\t");
  return i < 0 ? { show: word, answer: word } : { show: word.slice(0, i), answer: word.slice(i + 1) };
}

const bin = (n: number, bits: number) => n.toString(2).padStart(bits, "0");

/** 짧은 영어 낱말 (ASCII 해독용, 대문자) */
const ASCII_WORDS = ["HI", "OK", "CAT", "DOG", "SUN", "BIT", "CODE", "BYTE", "DATA", "GAME", "TADAK"];

/**
 * 비트 해독기 문제 순서: 점점 어려워져요
 *  · 처음 16개: 4비트 (이진수 → 십진수, 십진수 → 이진수)
 *  · 다음 24개: 8비트 숫자
 *  · 그다음: ASCII 대문자 한 글자, 짧은 낱말
 */
export function bitsSequence(seed: number, count = 240): string[] {
  const rand = seededRandom(seed);
  const int = (n: number) => Math.floor(rand() * n);
  const out: string[] = [];
  for (let k = 0; k < count; k++) {
    if (k < 16 || (k >= 40 && rand() < 0.2)) {
      const n = 1 + int(15);
      out.push(rand() < 0.5 ? `${bin(n, 4)}₂ = ?\t${n}` : `${n} = ?₂\t${bin(n, 4)}`);
    } else if (k < 40 || rand() < 0.4) {
      const n = 16 + int(240);
      out.push(rand() < 0.6 ? `${bin(n, 8)}₂ = ?\t${n}` : `${n} = ?₂\t${bin(n, 8)}`);
    } else if (rand() < 0.6) {
      const c = 65 + int(26);
      out.push(`${bin(c, 8)} = ?\t${String.fromCharCode(c)}`);
    } else {
      const w = ASCII_WORDS[int(ASCII_WORDS.length)];
      out.push(`${[...w].map((ch) => bin(ch.charCodeAt(0), 8)).join(" ")}\t${w}`);
    }
  }
  return out;
}

/** 입출력 레이스: 장치 이름 → i(입력) / o(출력) / io(둘 다) */
export const IO_DEVICES: readonly [string, "i" | "o" | "io"][] = [
  ["키보드", "i"],
  ["마우스", "i"],
  ["마이크", "i"],
  ["스캐너", "i"],
  ["웹캠", "i"],
  ["터치패드", "i"],
  ["조이스틱", "i"],
  ["바코드 리더기", "i"],
  ["온도 센서", "i"],
  ["디지털 펜", "i"],
  ["모니터", "o"],
  ["스피커", "o"],
  ["프린터", "o"],
  ["이어폰", "o"],
  ["빔 프로젝터", "o"],
  ["3D 프린터", "o"],
  ["LED 전광판", "o"],
  ["진동 모터", "o"],
  ["터치스크린", "io"],
  ["헤드셋(마이크 달린)", "io"],
];

export function ioSequence(seed: number, count = 240): string[] {
  const rand = seededRandom(seed);
  const out: string[] = [];
  let last = -1;
  for (let k = 0; k < count; k++) {
    let i = Math.floor(rand() * IO_DEVICES.length);
    if (i === last) i = (i + 1) % IO_DEVICES.length;
    last = i;
    out.push(`${IO_DEVICES[i][0]}\t${IO_DEVICES[i][1]}`);
  }
  return out;
}
