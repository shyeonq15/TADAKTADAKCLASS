// 오늘의 미션 구성 (PRD P3). 교사 지정 미션은 교사 화면이 생기면 여기서 우선 적용합니다.

import { MISSION, TRACKS, type Track } from "@/config/game";
import { getLevel } from "@/data/packs";
import { buildRound, buildWeakKeyRound } from "@/lib/typing/passage";
import type { Progress } from "./store";

export type MissionRound = {
  track: Track;
  level: number;
  kind: "mission" | "weak";
  title: string;
  build: () => string[];
};

/** 날짜마다 트랙이 돌아가며 바뀜: 한글 → 영타 → 기호 → 코드 */
export function todayTrack(now = new Date()): Track {
  const day = Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);
  return TRACKS[day % TRACKS.length];
}

export function missionRounds(progress: Progress, weak: string[], now = new Date()): MissionRound[] {
  const track = todayTrack(now);
  const level = getLevel(track, progress.unlocked[track])!;
  const rounds: MissionRound[] = [];
  for (let i = 0; i < MISSION.rounds; i++) {
    const isWeak = i === MISSION.rounds - 1 && weak.length > 0;
    rounds.push(
      isWeak
        ? { track, level: 0, kind: "weak", title: `약한 키 ${weak.join(" ")}`, build: () => buildWeakKeyRound(track, weak) }
        : {
            track,
            level: level.level,
            kind: "mission",
            title: `레벨 ${level.level} · ${level.title}`,
            build: () => buildRound(track, level),
          },
    );
  }
  return rounds;
}

const MISSION_TITLES: Record<Track, string> = {
  korean: "오늘은 한글 문장과 친해지는 날",
  english: "오늘은 영어 자판을 탐험해요",
  symbol: "오늘은 괄호 친구들을 만나러 가요",
  code: "오늘은 파이썬 코드를 따라 쳐요",
};

export const missionTitle = (track: Track) => MISSION_TITLES[track];
