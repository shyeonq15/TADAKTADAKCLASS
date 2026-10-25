"use server";

import { getViewer } from "@/lib/auth/viewer";
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
