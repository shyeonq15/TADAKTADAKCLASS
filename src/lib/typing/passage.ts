// 연습팩 항목을 한 판 분량의 줄로 만듭니다.

import type { Track } from "@/config/game";
import { PACKS, type Level } from "@/data/packs";
import { toKeys } from "./hangul";

/** 한 줄 최대 글자 수. 한글은 글자 폭이 넓어서 더 짧게 */
const LINE_WIDTH: Record<Track, number> = { korean: 22, english: 36, symbol: 32, code: 48 };
const LINES_PER_ROUND = 4;

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 짧은 항목을 공백으로 이어 붙여 줄을 만듦 */
function packIntoLines(items: readonly string[], width: number, lineCount: number): string[] {
  const lines: string[] = [];
  let pool = shuffle(items);
  let line = "";
  while (lines.length < lineCount) {
    if (pool.length === 0) pool = shuffle(items);
    const word = pool.pop()!;
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  return lines;
}

export function buildRound(track: Track, level: Level): string[] {
  switch (level.mode) {
    case "keys":
    case "words":
      return packIntoLines(level.items, LINE_WIDTH[track], LINES_PER_ROUND);
    case "sentences":
      return shuffle(level.items).slice(0, LINES_PER_ROUND);
    case "code":
      return shuffle(level.items)[0].split("\n").map((l) => l.trimEnd());
  }
}

/** 약한 키가 들어간 항목만 모아 맞춤 연습 지문을 만듦 */
export function buildWeakKeyRound(track: Track, weakKeys: readonly string[]): string[] {
  const all = PACKS[track].levels.flatMap((l) =>
    l.mode === "code" || l.mode === "sentences" ? l.items.flatMap((i) => i.split(/\n| /)) : l.items,
  );
  const hasWeak = (item: string) => [...item].some((ch) => toKeys(ch).some((k) => weakKeys.includes(k)));
  const picked = [...new Set(all.map((s) => s.trim()).filter((s) => s && hasWeak(s)))];
  return packIntoLines(picked.length >= 4 ? picked : all, LINE_WIDTH[track], LINES_PER_ROUND);
}

/** 배치 테스트용: 트랙의 모든 레벨에서 고루 섞은 지문 (30초 안에 다 못 칠 만큼) */
export function buildPlacementRound(track: Track): string[] {
  const levels = PACKS[track].levels;
  if (track === "code") return levels.map((l) => l.items[0]).join("\n").split("\n").map((l) => l.trimEnd());
  const items = levels.flatMap((l) => (l.mode === "sentences" ? l.items : l.items.slice(0, 8)));
  return packIntoLines(items, LINE_WIDTH[track], 10);
}
