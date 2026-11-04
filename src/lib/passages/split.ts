// 선생님이 붙여 넣은 글 → 연습 판(passage)들로 나누기. 화면 미리보기와 서버 저장이 같이 씁니다.
//  · 글: 문장으로 나누고, 긴 문장은 띄어쓰기 기준으로 줄을 나눔 → 문장을 통째로 4줄 안쪽씩 한 판 (문장이 판 사이에서 끊기지 않게)
//  · 코드: 줄바꿈·들여쓰기를 그대로 두고, 빈 줄을 기준으로 끊어 12줄 안쪽으로 한 판

import type { Track } from "@/config/game";
import type { PracticeMode } from "@/data/packs";

/** 한 줄 최대 글자 수 (타자 화면 폭 기준). 한글은 글자가 넓어서 짧게 */
export const MAX_LINE: Record<Track, number> = { korean: 30, english: 52, symbol: 40, code: 60 };
const LINES_PER_ROUND = 4;
const MAX_CODE_LINES = 12;
export const MAX_ROUNDS = 60;

/** 키보드로 치기 어려운 문자를 바꿈 (둥근 따옴표, 말줄임표, 긴 줄표, 특수 공백 …) */
export function normalizeText(raw: string) {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/…/g, "...")
    .replace(/[‐-―−]/g, "-")
    .replace(/[  -​　﻿]/g, " ")
    .replace(/\t/g, "    ");
}

/** 화면에 보이는 글자 수 (교과 탐험 퀴즈 표시 [대괄호]는 타자 칠 때 빠지니까 세지 않아요) */
const shown = (s: string) => s.replace(/[[]]/g, "").length;

/** 띄어쓰기 기준으로 max 글자 안쪽 줄들로 나눔 (단어 하나가 너무 길면 그대로 둠) */
function wrap(sentence: string, max: number): string[] {
  const words = sentence.split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line && shown(line) + 1 + shown(w) > max) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 글을 문장 단위로 (마침표·물음표·느낌표 뒤, 또는 줄바꿈) */
function sentences(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((para) => para.replace(/\s+/g, " ").trim().split(/(?<=[.!?。])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

export type SplitResult = { mode: PracticeMode; rounds: string[][] };

export function splitPassage(raw: string, track: Track): SplitResult {
  const text = normalizeText(raw);

  if (track === "code") {
    const lines = text.split("\n").map((l) => l.replace(/\s+$/, ""));
    const rounds: string[][] = [];
    let cur: string[] = [];
    const flush = () => {
      while (cur.length && !cur[0].trim()) cur.shift();
      while (cur.length && !cur[cur.length - 1].trim()) cur.pop();
      if (cur.length) rounds.push(cur.filter((l) => l.trim()));
      cur = [];
    };
    for (const line of lines) {
      if (!line.trim() && cur.length >= 4) flush(); // 빈 줄 = 덩어리 끝 (너무 짧으면 이어 붙임)
      else if (line.trim()) cur.push(line);
      if (cur.length >= MAX_CODE_LINES) flush();
    }
    flush();
    return { mode: "code", rounds: rounds.slice(0, MAX_ROUNDS) };
  }

  // 문장 하나는 한 판 안에: 다음 문장을 더하면 4줄을 넘을 때 새 판 (문장 하나가 4줄보다 길면 그 문장만 한 판)
  const rounds: string[][] = [];
  let cur: string[] = [];
  for (const s of sentences(text)) {
    const lines = wrap(s, MAX_LINE[track]);
    if (cur.length && cur.length + lines.length > LINES_PER_ROUND) {
      rounds.push(cur);
      cur = [];
    }
    cur.push(...lines);
  }
  if (cur.length) rounds.push(cur);
  return { mode: "sentences", rounds: rounds.slice(0, MAX_ROUNDS) };
}
