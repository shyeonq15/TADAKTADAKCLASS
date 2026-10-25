"use server";

import type { SoloGame, Track } from "@/config/game";
import { getViewer } from "@/lib/auth/viewer";
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
