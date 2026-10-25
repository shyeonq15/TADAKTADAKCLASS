// 단어 비: 위에서 떨어지는 단어를 바닥에 닿기 전에 쳐서 터뜨리는 게임.
// 화면과 서버가 같이 쓰는 순수 함수 (단어 순서 만들기, 점수 다시 계산하기).

import { GAMES, type Track } from "@/config/game";
import { PACKS } from "@/data/packs";
import { countKeystrokes } from "@/lib/typing/hangul";

const RAIN = GAMES.rain;

/** 시드가 같으면 늘 같은 순서가 나오는 난수 (서버와 화면이 같은 단어 순서를 쓰려고) */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 내가 연 레벨까지의 단어 모음 */
export function rainPool(track: Track, unlockedLevel: number): string[] {
  const words = new Set<string>();
  for (const lv of PACKS[track].levels) {
    if (lv.level > unlockedLevel) continue;
    for (const item of lv.items) {
      if (lv.mode === "sentences") {
        for (const w of item.split(" ")) {
          const clean = w.replace(/[.,!?]/g, "");
          if (clean.length >= 2) words.add(clean);
        }
      } else if (lv.mode === "code") {
        for (const line of item.split("\n")) {
          const t = line.trim();
          if (t && t.length <= 24) words.add(t);
        }
      } else {
        words.add(item.trim());
      }
    }
  }
  return [...words];
}

/** 한 판에 떨어질 단어 순서 (충분히 길게) */
export function rainSequence(track: Track, unlockedLevel: number, seed: number, count = 240): string[] {
  const pool = rainPool(track, unlockedLevel);
  const rand = seededRandom(seed);
  const out: string[] = [];
  let last = "";
  while (out.length < count) {
    const w = pool[Math.floor(rand() * pool.length)];
    if (w === last && pool.length > 1) continue;
    out.push(w);
    last = w;
  }
  return out;
}

/** 단계: 몇 개 터뜨렸는지로 정해짐 */
export const rainStage = (hits: number) => 1 + Math.floor(hits / RAIN.hitsPerStage);

/** 이 단계에서 바닥까지 떨어지는 시간(ms). 긴 단어는 조금 더 천천히 */
export function fallMs(stage: number, word: string) {
  const base = Math.max(RAIN.fallSeconds.min, RAIN.fallSeconds.start - (stage - 1) * RAIN.fallSeconds.perStage);
  return base * 1000 * (1 + Math.max(0, word.length - 6) / 24);
}

export function spawnMs(stage: number) {
  return Math.max(RAIN.spawnSeconds.min, RAIN.spawnSeconds.start - (stage - 1) * RAIN.spawnSeconds.perStage) * 1000;
}

/** 게임 중 일어난 일. t는 게임 시작부터 ms */
export type RainEvent = { t: number; type: "hit" | "miss"; i: number } | { t: number; type: "wrong" };

export type RainResult = {
  score: number;
  hits: number;
  misses: number;
  wrong: number;
  maxCombo: number;
  /** 터뜨린 단어의 자모 수 */
  keystrokes: number;
  /** 사건 기록이 말이 되는지 (서버 확인용) */
  valid: boolean;
};

/** 사건 기록으로 점수를 처음부터 다시 계산 (서버는 화면이 보낸 점수를 믿지 않음) */
export function replayRain(words: readonly string[], events: readonly RainEvent[], durationMs: number): RainResult {
  let score = 0;
  let hits = 0;
  let misses = 0;
  let wrong = 0;
  let combo = 0;
  let maxCombo = 0;
  let keystrokes = 0;
  let valid = true;
  let lastT = 0;
  const used = new Set<number>();

  for (const e of events) {
    if (e.t < lastT - 50 || e.t > durationMs + 3000) valid = false;
    lastT = Math.max(lastT, e.t);
    if (e.type === "wrong") {
      wrong++;
      combo = 0;
      continue;
    }
    if (!Number.isInteger(e.i) || e.i < 0 || e.i >= words.length || used.has(e.i)) {
      valid = false;
      continue;
    }
    used.add(e.i);
    if (e.type === "miss") {
      misses++;
      combo = 0;
      if (misses >= RAIN.hearts) break;
      continue;
    }
    const k = countKeystrokes(words[e.i]);
    const mult = 1 + Math.floor(combo / RAIN.comboStep) * RAIN.comboBonus;
    score += Math.round(k * 10 * mult);
    keystrokes += k;
    hits++;
    combo++;
    maxCombo = Math.max(maxCombo, combo);
  }
  return { score, hits, misses, wrong, maxCombo, keystrokes, valid };
}

/** 친 글자와 떨어지는 단어가 이어지는지 (조합 중인 한글 마지막 글자는 빼고 비교) */
export function startsLike(word: string, typed: string, composing: boolean) {
  if (!typed) return false;
  const settled = composing ? typed.slice(0, -1) : typed;
  return settled.length > 0 ? word.startsWith(settled) : false;
}
