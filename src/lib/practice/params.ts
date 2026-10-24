import { TRACKS, type Track } from "@/config/game";
import { getLevel } from "@/data/packs";

export const isTrack = (t: string): t is Track => (TRACKS as readonly string[]).includes(t);

/** 주소의 트랙·레벨이 올바른지 확인. 틀리면 null */
export function parseTrackLevel(track: string, level: string) {
  if (!isTrack(track)) return null;
  const n = Number(level);
  const lv = getLevel(track, n);
  return lv ? { track, level: lv } : null;
}
