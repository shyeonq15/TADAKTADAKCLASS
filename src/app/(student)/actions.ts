"use server";

import type { RaceDifficulty, SoloGame, Track } from "@/config/game";
import { getViewer } from "@/lib/auth/viewer";
import { issueBossChallenge, saveBossChallenge, type BossSubmission } from "@/lib/games/boss";
import { createMatch, getMatch, joinMatch, leaveMatch, startMatch, submitRace } from "@/lib/games/race";
import { issueGame, saveGame, type GameSubmission } from "@/lib/games/server";
import { completeMission, finishPlacement, issueRound, saveRound } from "@/lib/practice/server";
import type { RoundRequest, RoundSubmission } from "@/lib/practice/types";

async function who() {
  const v = await getViewer();
  if (!v) return null;
  return { userId: v.userId, classId: v.enrollment?.classId ?? null };
}

const NOT_LOGGED_IN = { error: "로그인이 풀렸어요. 다시 로그인해 주세요." } as const;

export async function startRound(req: RoundRequest) {
  const w = await who();
  return w ? issueRound(w, req) : NOT_LOGGED_IN;
}

export async function submitRound(sub: RoundSubmission) {
  const w = await who();
  return w ? saveRound(w, sub) : NOT_LOGGED_IN;
}

export async function finishMission() {
  const w = await who();
  return w ? completeMission(w) : NOT_LOGGED_IN;
}

export async function submitPlacement() {
  const w = await who();
  return w ? finishPlacement(w) : NOT_LOGGED_IN;
}

/* ───── 혼자 하는 게임 ───── */

export async function startGame(game: SoloGame, track: Track) {
  const w = await who();
  return w ? issueGame(w, game, track) : NOT_LOGGED_IN;
}

export async function submitGame(sub: GameSubmission) {
  const w = await who();
  return w ? saveGame(w, sub) : NOT_LOGGED_IN;
}

/* ───── 친구 대결 ───── */

export async function raceCreate(track: Track, difficulty: RaceDifficulty) {
  const w = await who();
  return w ? createMatch(w, track, difficulty) : NOT_LOGGED_IN;
}

export async function raceJoin(matchId: string) {
  const w = await who();
  return w ? joinMatch(w, matchId) : NOT_LOGGED_IN;
}

export async function raceLeave(matchId: string) {
  const w = await who();
  return w ? leaveMatch(w, matchId) : NOT_LOGGED_IN;
}

export async function raceStart(matchId: string) {
  const w = await who();
  return w ? startMatch(w, matchId) : NOT_LOGGED_IN;
}

export async function raceInfo(matchId: string) {
  const w = await who();
  return w ? getMatch(w, matchId) : NOT_LOGGED_IN;
}

export async function raceSubmit(sub: BossSubmission) {
  const w = await who();
  return w ? submitRace(w, sub) : NOT_LOGGED_IN;
}

/* ───── 보스전 ───── */

export async function startBoss(bossId: string) {
  const v = await getViewer();
  if (!v) return NOT_LOGGED_IN;
  return issueBossChallenge({ userId: v.userId, classId: v.enrollment?.classId ?? null }, v.schoolId, bossId);
}

export async function submitBoss(sub: BossSubmission) {
  const v = await getViewer();
  if (!v) return NOT_LOGGED_IN;
  return saveBossChallenge({ userId: v.userId, classId: v.enrollment?.classId ?? null }, v.schoolId, sub);
}
