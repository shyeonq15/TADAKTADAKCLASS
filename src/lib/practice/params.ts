import { TRACKS, type Track } from "@/config/game";
import { getStage } from "./stages";

export const isTrack = (t: string): t is Track => (TRACKS as readonly string[]).includes(t);

/** 주소의 트랙·단계가 올바른지 확인. 틀리면 null */
export function parseTrackLevel(track: string, level: string) {
  if (!isTrack(track)) return null;
  const n = Number(level);
  const st = Number.isInteger(n) ? getStage(track, n) : undefined;
  return st ? { track, level: st } : null;
}
