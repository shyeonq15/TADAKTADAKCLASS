import "server-only";

// 단어 비·토끼 달리기에 나올 단어 (서버 전용).
// 문장(코드는 한 줄)을 하나 골라 그 안의 낱말을 "순서대로" 내보내서, 단어가 이어지는 글처럼 읽히게 해요.
//   · 한글·기호·코드: 트랙 연습팩(교과서·자료집 지문)에서, 학생이 지금 있는 단계 근처 글로
//   · 영타: 예전 연습팩(english.json)에서

import type { Track } from "@/config/game";
import { PACKS } from "@/data/packs";
import { getTrack } from "@/lib/packs";
import { STAGE_COUNT, stepOfStage, tierOfStage } from "@/lib/practice/stages";
import { seededRandom } from "./rain";

/** 지금 단계에서 몇 단계 아래 글까지 섞을지 */
const NEARBY_STAGES = 4;
/** 기호·코드: 코드 줄을 띄어쓰기로 나눈 조각이 이보다 길면 빼요 (줄 통째로는 너무 어려웠어요) */
const MAX_TOKEN = 12;

const cleanWord = (w: string) => w.replace(/^["'“‘(]+|["'”’),.!?…:;]+$/g, "");

/** 글 → 문장들 → 문장마다 낱말 순서 */
function textUnits(text: string): string[][] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.split(/\s+/).map(cleanWord).filter(Boolean))
    .filter((words) => words.length > 0);
}

/** 코드 → 한 프로그램 = 한 덩어리. 줄을 띄어쓰기로 나눈 조각을 순서대로 (너무 긴 조각은 빼요) */
function codeUnits(text: string): string[][] {
  const tokens = text
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t && t.length <= MAX_TOKEN);
  return tokens.length ? [tokens] : [];
}

/** 단어 재료: 문장(또는 프로그램)마다 순서 있는 낱말 목록 */
export function gameUnits(track: Track, stage: number): string[][] {
  const pack = getTrack(track);
  if (pack) {
    const units: string[][] = [];
    for (let n = Math.max(1, stage - NEARBY_STAGES); n <= Math.min(stage, STAGE_COUNT); n++) {
      const st = pack.tiers.find((t) => t.id === tierOfStage(n))?.stages.find((s) => s.stage === stepOfStage(n));
      for (const p of st?.passages ?? []) units.push(...(track === "korean" ? textUnits(p.text) : codeUnits(p.text)));
    }
    if (units.length) return units;
  }
  // 영타(또는 연습팩이 없을 때): 예전 연습팩 글 중 지금 단계까지
  const units: string[][] = [];
  for (const lv of PACKS[track].levels) {
    if (lv.level > Math.ceil(stage / 4) + 1) continue;
    for (const item of lv.items) {
      if (lv.mode === "code") units.push(...codeUnits(item));
      else units.push(...textUnits(item));
    }
  }
  return units;
}

/** 한 판에 나올 단어 순서: 문장을 무작위로 골라 그 낱말을 순서대로 (시드가 같으면 늘 같은 순서) */
export function gameSequence(track: Track, stage: number, seed: number, count = 240): string[] {
  const units = gameUnits(track, stage);
  if (!units.length) return [];
  const rand = seededRandom(seed);
  const out: string[] = [];
  let last = -1;
  while (out.length < count) {
    let k = Math.floor(rand() * units.length);
    if (k === last && units.length > 1) k = (k + 1) % units.length;
    last = k;
    out.push(...units[k]);
  }
  return out.slice(0, count);
}
