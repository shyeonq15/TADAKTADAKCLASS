// 영단어 연구소: 단어 묶음 꺼내기, 이번 주 묶음, 빈칸 만들기. 화면과 서버가 같이 쓰는 순수 함수예요.

import VOCAB_DATA from "@/data/vocab.json";
import { VOCAB } from "@/config/vocab";

export type VocabWord = { n: number; en: string; ko: string; hide?: boolean; fixed?: boolean };
export type VocabPart = { part: number; set: number; k: number; from: number; to: number };

const ALL = VOCAB_DATA.words as VocabWord[];
export const VOCAB_PARTS = VOCAB_DATA.parts as VocabPart[];
/** 학생 활동에 쓰는 단어 (숨긴 단어 빼고) */
export const VOCAB_WORDS = ALL.filter((w) => !w.hide);
const BY_EN = new Map(VOCAB_WORDS.map((w) => [w.en, w]));

export const findWord = (en: string) => BY_EN.get(en);
export const getPart = (part: number) => VOCAB_PARTS.find((p) => p.part === part);
export const partWords = (part: number): VocabWord[] => {
  const p = getPart(part);
  return p ? VOCAB_WORDS.filter((w) => w.n >= p.from && w.n <= p.to) : [];
};
/** "4탄 ① 301~325" */
export const partLabel = (p: VocabPart) => `${p.set}탄 ${"①②③④"[p.k - 1]} ${p.from}~${p.to}`;

/** 이 주(월요일 날짜)에 나오는 묶음 번호와 몇 번째 주인지 */
export function weekPart(weekStart: string) {
  const weeks = Math.floor((Date.parse(`${weekStart}T00:00:00Z`) - Date.parse(`${VOCAB.week.firstMonday}T00:00:00Z`)) / (7 * 86400000));
  const n = VOCAB_PARTS.length;
  const part = ((((VOCAB.week.firstPart - 1 + weeks) % n) + n) % n) + 1;
  return { week: Math.max(0, weeks) + 1, part };
}

/** 시드가 같으면 늘 같은 순서 (서버와 화면이 같은 순서를 쓰려고) */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(arr: readonly T[], seed = Math.floor(Math.random() * 2 ** 31)): T[] {
  const rand = seeded(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 뜻 비 단어 순서: "뜻\t영어" (단어 비는 탭 앞을 보여 주고 탭 뒤를 치게 해요).
 * 묶음 단어를 섞어 한 바퀴씩 이어 붙여요. 띄어쓰기가 있는 단어(living room)는 단어 비에서 칠 수 없어서 빼요
 */
export function vocabRainSequence(part: number, seed: number, count = 240): string[] {
  const words = partWords(part).filter((w) => !w.en.includes(" "));
  if (!words.length) return [];
  const out: string[] = [];
  let round = 0;
  while (out.length < count) {
    const order = shuffled(words, seed + round++);
    // 바퀴가 바뀔 때 같은 단어가 바로 이어 나오지 않게
    if (out.length && order[0].en === out[out.length - 1].split("\t")[1]) order.push(order.shift()!);
    out.push(...order.map((w) => `${w.ko}\t${w.en}`));
  }
  return out.slice(0, count);
}

/** 빈칸 모양: 가릴 글자 위치 (첫 글자와 띄어쓰기는 늘 보여 줘요). 같은 단어는 늘 같은 모양 */
export function blankMask(en: string): boolean[] {
  let h = 0;
  for (const ch of en) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  const rand = seeded(h);
  const letters = [...en].map((ch, i) => ({ ch, i })).filter(({ ch, i }) => i > 0 && ch !== " ");
  const hideCount = Math.max(1, Math.round(letters.length * VOCAB.blankHideRatio));
  const hidden = new Set(shuffled(letters, Math.floor(rand() * 2 ** 31)).slice(0, hideCount).map((l) => l.i));
  return [...en].map((_, i) => hidden.has(i));
}

/** "d_s_rt" */
export const blankText = (en: string) => {
  const mask = blankMask(en);
  return [...en].map((ch, i) => (mask[i] ? "_" : ch)).join("");
};

/** 답 비교: 대소문자·앞뒤 띄어쓰기·여러 칸 띄어쓰기는 너그럽게 */
export const sameWord = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");
