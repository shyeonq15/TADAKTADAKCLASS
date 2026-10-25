// 오늘의 미션 구성 (PRD P3). 교사 지정 미션은 교사 화면에서 지정하면 여기서 우선 적용합니다.

import { MISSION, TRACKS, type Track } from "@/config/game";
import { getLevel } from "@/data/packs";
import type { Progress, RoundRequest } from "./types";

export type MissionRound = { request: RoundRequest; title: string };

/** 날짜마다 트랙이 돌아가며 바뀜: 한글 → 영타 → 기호 → 코드 (한국 시간 기준) */
export function todayTrack(now = Date.now()): Track {
  const day = Math.floor((now + 9 * 3600000) / 86400000);
  return TRACKS[day % TRACKS.length];
}

/** 미션 3판: 내 레벨 2판 + (약한 키가 있으면) 약한 키 맞춤 1판 */
export function missionRounds(progress: Progress, hasWeakKeys: boolean, now = Date.now()): MissionRound[] {
  const track = todayTrack(now);
  const level = getLevel(track, progress.unlocked[track])!;
  return Array.from({ length: MISSION.rounds }, (_, i) =>
    i === MISSION.rounds - 1 && hasWeakKeys
      ? { request: { kind: "mission", track, level: level.level, weak: true }, title: "약한 키 맞춤" }
      : { request: { kind: "mission", track, level: level.level }, title: `레벨 ${level.level} · ${level.title}` },
  );
}

const MISSION_TITLES: Record<Track, string> = {
  korean: "오늘은 한글 문장과 친해지는 날",
  english: "오늘은 영어 자판을 탐험해요",
  symbol: "오늘은 괄호 친구들을 만나러 가요",
  code: "오늘은 파이썬 코드를 따라 쳐요",
};

export const missionTitle = (track: Track) => MISSION_TITLES[track];
