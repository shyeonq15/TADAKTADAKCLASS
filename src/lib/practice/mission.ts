// 오늘의 미션 구성 (PRD P3). 선생님이 지정한 미션이 있으면 그게 먼저예요.

import { GROWTH, MISSION, TRACKS, type Track } from "@/config/game";
import { getStage, missingLessons, stageName } from "./stages";
import { median } from "@/lib/scoring/growth";
import type { PracticeData, RoundRequest, TeacherPack } from "./types";

export type MissionRound = { request: RoundRequest; title: string };

/** 날짜마다 트랙이 돌아가며 바뀜: 한글 → 영타 → 기호 → 코드 (한국 시간 기준) */
export function todayTrack(now = Date.now()): Track {
  const day = Math.floor((now + 9 * 3600000) / 86400000);
  return TRACKS[day % TRACKS.length];
}

/** 선생님이 오늘의 미션으로 지정한 연습팩 (있으면 그게 오늘 미션) */
export const teacherMission = (packs: readonly TeacherPack[]) => packs.find((p) => p.missionToday) ?? null;

/**
 * 미션 레벨 자동 조절: 처음엔 배치 테스트로 열린 가장 높은 레벨,
 * 그 레벨에서 최근 3판이 모두 많이 어려웠으면(정확도 85% 미만 또는 목표 타수의 60% 미만) 한 단계 아래로.
 * 늘 "조금 어려운" 정도를 유지하려는 것.
 */
export function missionLevel(data: PracticeData, track: Track) {
  const top = data.progress.unlocked[track];
  const goal = getStage(track, top)?.goalCpm ?? 0;
  const recent = data.attempts
    .filter((a) => a.track === track && a.level === top && (a.kind === "practice" || a.kind === "mission") && !a.suspicious)
    .slice(-3);
  const struggling =
    recent.length >= 3 && recent.every((a) => a.accuracy < GROWTH.minAccuracyForSpeed || a.cpm < goal * 0.6);
  let level = struggling && top > 1 ? top - 1 : top;
  // 코드 트랙: 연결 강을 아직 안 들은 단계는 건너뛰고 그 아래에서 (하나도 없으면 0)
  while (level > 0 && missingLessons(track, level, data.progress.cleared).length) level--;
  return level;
}

/** 오늘 미션 트랙: 날짜 순서대로, 다만 코드 트랙인데 칠 수 있는 단계가 없으면(첫걸음 1~3강 전) 기호 트랙으로 */
export function missionTrack(data: PracticeData, now = Date.now()): Track {
  const track = todayTrack(now);
  return missionLevel(data, track) > 0 ? track : "symbol";
}

/** 미션 3판: 선생님 미션이 있으면 그 연습팩 3판, 없으면 내 레벨 2판 + (약한 키가 있으면) 약한 키 맞춤 1판 */
export function missionRounds(data: PracticeData, hasWeakKeys: boolean, now = Date.now()): MissionRound[] {
  const tm = teacherMission(data.packs);
  if (tm) {
    return Array.from({ length: MISSION.rounds }, () => ({
      request: { kind: "mission", track: tm.track, level: 0, packId: tm.id },
      title: `선생님 미션 · ${tm.title}`,
    }));
  }
  const track = missionTrack(data, now);
  const stage = getStage(track, missionLevel(data, track))!;
  return Array.from({ length: MISSION.rounds }, (_, i) =>
    i === MISSION.rounds - 1 && hasWeakKeys
      ? { request: { kind: "mission", track, level: stage.stage, weak: true }, title: "약한 키 맞춤" }
      : { request: { kind: "mission", track, level: stage.stage }, title: `${stageName(stage.stage)} · ${stage.level.title}` },
  );
}

const MISSION_TITLES: Record<Track, string> = {
  korean: "오늘은 한글 문장과 친해지는 날",
  english: "오늘은 영어 자판을 탐험해요",
  symbol: "오늘은 괄호 친구들을 만나러 가요",
  code: "오늘은 파이썬 코드를 따라 쳐요",
};

export const missionTitle = (track: Track) => MISSION_TITLES[track];

/** 처음의 나(배치 테스트)와 최근 5판 가운데 값 비교 */
export function sinceStart(data: PracticeData, track: Track) {
  const start = data.progress.placement?.[track];
  const recent = data.attempts
    .filter((a) => a.track === track && (a.kind === "practice" || a.kind === "mission") && a.level > 0 && !a.suspicious)
    .slice(-5);
  if (!start || recent.length === 0) return null;
  const now = Math.round(median(recent.map((a) => a.cpm)));
  return { start, now, pct: Math.round(((now - start) / start) * 100) };
}
