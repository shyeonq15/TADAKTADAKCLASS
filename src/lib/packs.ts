// 트랙 연습팩 불러오기 (src/data/packs/*-track.json). 지금은 한글·기호·코드가 있고,
// 영타도 같은 모양 JSON 을 만들어 아래 목록에 한 줄 추가하면 그 트랙 단계에서 쓰여요.

import type { Tier, Track } from "@/config/game";
import code from "@/data/packs/code-track.json";
import korean from "@/data/packs/korean-track.json";
import symbol from "@/data/packs/symbol-track.json";
import type { TrackPack, TrackStage, TrackTier } from "@/data/packs/types";

const TRACK_PACKS: Partial<Record<Track, TrackPack>> = {
  korean: korean as unknown as TrackPack,
  symbol: symbol as unknown as TrackPack,
  code: code as unknown as TrackPack,
};

export function getTrack(track: Track): TrackPack | null {
  return TRACK_PACKS[track] ?? null;
}

export function getTrackTier(track: Track, tierId: Tier): TrackTier | null {
  return getTrack(track)?.tiers.find((t) => t.id === tierId) ?? null;
}

export function getTrackStage(track: Track, tierId: Tier, stage: number): TrackStage | null {
  return getTrackTier(track, tierId)?.stages.find((s) => s.stage === stage) ?? null;
}
