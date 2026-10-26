// 연습팩 항목을 한 판 분량의 줄로 만듭니다.

import type { Track } from "@/config/game";
import { PACKS, type Level } from "@/data/packs";
import PLACEMENT_TEXT from "@/data/placement.json";
import { splitPassage } from "@/lib/passages/split";
import { toKeys } from "./hangul";
import { pickRound } from "./round";

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

/** 문장이 화면 폭보다 길면 띄어쓰기에서 줄을 나눔 */
const wrapLines = (track: Track, texts: readonly string[]) => splitPassage(texts.join("\n"), track).rounds.flat();

/** 코드 지문 하나 고르기 (설명 카드를 붙이려고 몇 번째인지도 알려 줌) */
export function pickCode(level: Level) {
  const index = Math.floor(Math.random() * level.items.length);
  return { index, lines: level.items[index].split("\n").map((l) => l.trimEnd()) };
}

export function buildRound(track: Track, level: Level): string[] {
  switch (level.mode) {
    case "keys":
    case "words":
      return packIntoLines(level.items, LINE_WIDTH[track], LINES_PER_ROUND);
    case "sentences": {
      // 문장을 섞어서 4줄이 찰 때까지 (긴 문장은 두 줄이 될 수 있음)
      const lines: string[] = [];
      for (const s of shuffle(level.items)) {
        if (lines.length >= LINES_PER_ROUND) break;
        lines.push(...wrapLines(track, [s]));
      }
      return lines.slice(0, LINES_PER_ROUND + 1);
    }
    case "paragraph":
      // 문단 하나를 통째로 (보통 5~8줄)
      return wrapLines(track, [shuffle(level.items)[0]]);
    case "code":
      return shuffle(level.items)[0].split("\n").map((l) => l.trimEnd());
  }
}

/** 약한 키가 들어간 항목만 모아 맞춤 연습 지문을 만듦 */
export function buildWeakKeyRound(track: Track, weakKeys: readonly string[]): string[] {
  const all = PACKS[track].levels.flatMap((l) =>
    l.mode === "code" || l.mode === "sentences" || l.mode === "paragraph"
      ? l.items.flatMap((i) => i.split(/\n| /))
      : l.items,
  );
  const hasWeak = (item: string) => [...item].some((ch) => toKeys(ch).some((k) => weakKeys.includes(k)));
  const picked = [...new Set(all.map((s) => s.trim()).filter((s) => s && hasWeak(s)))];
  return packIntoLines(picked.length >= 4 ? picked : all, LINE_WIDTH[track], LINES_PER_ROUND);
}

/** 배치 테스트용 고정 지문 (다시 재도 같은 조건이 되도록 무작위로 바꾸지 않음) */
export function buildPlacementRound(track: Track): string[] {
  const text = (PLACEMENT_TEXT as unknown as Record<Track, string[]>)[track];
  return track === "code" ? [...text] : wrapLines(track, text);
}

/**
 * 연습팩 한 판 (기호·코드 트랙): 단계 지문에서 count 개를 겹치지 않게 뽑아요.
 *  · 코드: 줄바꿈·들여쓰기 그대로, 여러 줄 프로그램 사이에만 빈 줄 하나
 *  · 기호 조각(낱말): 공백으로 이어 붙여 줄을 채움
 *  · 그 밖(한 줄 식): 지문 하나 = 한 줄 (식을 중간에서 자르지 않음)
 */
export function buildPackRound(track: Track, level: Level, count: number): string[] {
  const picked = pickRound(level.items, count);
  if (level.mode === "code") {
    // 여러 줄 프로그램 사이에만 빈 줄 (빈 줄은 타자 칸에서 저절로 건너뜀). 한 줄 코드끼리는 그냥 이어서
    const gap = picked.some((text) => text.includes("\n"));
    return picked.flatMap((text, i) => [...(gap && i > 0 ? [""] : []), ...text.split("\n").map((l) => l.trimEnd())]);
  }
  if (level.mode === "words") {
    const lines: string[] = [];
    let line = "";
    for (const word of picked) {
      if (line && line.length + 1 + word.length > LINE_WIDTH[track]) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
  }
  return picked;
}
