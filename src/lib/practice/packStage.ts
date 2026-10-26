import "server-only";

// 단계 + 그 단계의 연습팩 지문 (서버 전용). 화면용 getStage 는 지문 없이 요약만 가져요.

import type { Track } from "@/config/game";
import { getTrackStage } from "@/lib/packs";
import { getStage, tierOfStage, stepOfStage, type Stage } from "./stages";

export function getStageWithPassages(track: Track, n: number): Stage | undefined {
  const st = getStage(track, n);
  if (!st?.fromPack) return st;
  const pack = getTrackStage(track, tierOfStage(n), stepOfStage(n));
  if (!pack) return st;
  return { ...st, level: { ...st.level, items: pack.passages.map((p) => p.text) } };
}
