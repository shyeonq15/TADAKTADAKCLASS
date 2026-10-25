import type { Track } from "@/config/game";
import code from "./code.json";
import english from "./english.json";
import korean from "./korean.json";
import symbol from "./symbol.json";

/** keys: 자리연습 · words: 낱말 · sentences: 문장 · paragraph: 문단 · code: 코드 따라치기 */
export type PracticeMode = "keys" | "words" | "sentences" | "paragraph" | "code";

export type Level = {
  level: number;
  title: string;
  mode: PracticeMode;
  /** 레벨 통과에 필요한 타수(타/분) */
  goalCpm: number;
  /** 심화 레벨 (6~8) */
  advanced?: boolean;
  items: string[];
};

export type Pack = {
  track: Track;
  title: string;
  source: string;
  levels: Level[];
};

export const PACKS = { korean, english, symbol, code } as Record<Track, Pack>;

export const MODE_LABELS: Record<PracticeMode, string> = {
  keys: "자리연습",
  words: "낱말",
  sentences: "문장",
  paragraph: "문단",
  code: "코드",
};

export function getLevel(track: Track, level: number): Level | undefined {
  return PACKS[track].levels.find((l) => l.level === level);
}

export const maxLevel = (track: Track) => PACKS[track].levels.length;
