"use server";

import type { RaceDifficulty, RaceMode, SoloGame, Track } from "@/config/game";
import { getViewer } from "@/lib/auth/viewer";
import {
  issueBossChallenge,
  issueStudentBoss,
  retireStudentBoss,
  saveBossChallenge,
  saveStudentBoss,
  type BossSubmission,
} from "@/lib/games/boss";
import { createMatch, getMatch, joinMatch, leaveMatch, leaveQueue, queueMatch, startMatch, submitRace } from "@/lib/games/race";
import { issueGame, saveGame, type GameSubmission } from "@/lib/games/server";
import type { MinimiSlot } from "@/config/shop";
import { proposeRoomItem, voteRoomItem } from "@/lib/room/server";
import { buyItem, equipItem } from "@/lib/shop/server";
import { addCoins, completeMission, finishPlacement, issueRound, loadUncached, saveRound } from "@/lib/practice/server";
import type { RoundRequest, RoundSubmission } from "@/lib/practice/types";
import { sendFeedback } from "@/lib/feedback/server";
import { BINARY_FIRST_CLEAR_COINS, BINARY_STAGES } from "@/config/binary";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimWeekly } from "@/lib/weekly/server";
import { deletePixelArt, savePixelArt } from "@/lib/pixel/server";
import { checkInvite, setBlockInvites } from "@/lib/games/invites";
import { changeNickname, saveBio } from "@/lib/profile/server";
import { claimVocabWeek, clearPart, loadNotebook, loadVocabWeek, recordAnswers, type VocabAnswer, type VocabClearKind } from "@/lib/vocab/server";

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

export async function startGame(game: SoloGame, track: Track, opts?: { part?: number }) {
  const w = await who();
  return w ? issueGame(w, game, track, opts) : NOT_LOGGED_IN;
}

export async function submitGame(sub: GameSubmission) {
  const w = await who();
  return w ? saveGame(w, sub) : NOT_LOGGED_IN;
}

/* ───── 친구 대결 ───── */

export async function raceCreate(track: Track, difficulty: RaceDifficulty, mode: RaceMode = "classic") {
  const w = await who();
  return w ? createMatch(w, track, difficulty, mode) : NOT_LOGGED_IN;
}

/** 자동 매치: 화면이 2초마다 불러요 */
export async function raceQueue(track: Track) {
  const w = await who();
  return w ? queueMatch(w, track) : NOT_LOGGED_IN;
}

export async function raceQueueLeave() {
  const w = await who();
  return w ? leaveQueue(w) : NOT_LOGGED_IN;
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

/* ───── 상점 (미니미) ───── */

export async function shopBuy(itemId: string) {
  const w = await who();
  return w ? buyItem(w, itemId) : NOT_LOGGED_IN;
}

export async function shopEquip(slot: MinimiSlot, itemId: string | null) {
  const w = await who();
  return w ? equipItem(w, slot, itemId) : NOT_LOGGED_IN;
}

/* ───── 반 미니룸 (투표) ───── */

export async function roomPropose(itemId: string) {
  const w = await who();
  return w ? proposeRoomItem(w, itemId) : NOT_LOGGED_IN;
}

export async function roomVote(proposalId: string) {
  const w = await who();
  return w ? voteRoomItem(w, proposalId) : NOT_LOGGED_IN;
}

/* ───────── 대결 신청 지키기 ───────── */

export async function raceInvite(toId: string) {
  const w = await who();
  return w ? checkInvite(w.userId, toId) : NOT_LOGGED_IN;
}

export async function raceBlockInvites(on: boolean) {
  const w = await who();
  return w ? setBlockInvites(w.userId, on) : NOT_LOGGED_IN;
}

/* ───────── 건의함 ───────── */

export async function submitFeedback(input: { kind: string; body: string; page?: string }) {
  const v = await getViewer();
  if (!v) return NOT_LOGGED_IN;
  return sendFeedback({ userId: v.userId, schoolId: v.schoolId, classId: v.enrollment?.classId ?? null }, input);
}

/* ───────── 프로필 ───────── */

export async function updateBio(bio: string) {
  const v = await getViewer();
  if (!v) return NOT_LOGGED_IN;
  return saveBio(v.userId, bio);
}

export async function renameNickname(nickname: string) {
  const v = await getViewer();
  if (!v || v.role !== "student") return NOT_LOGGED_IN;
  const res = await changeNickname(v, nickname);
  if ("error" in res) return res;
  return { ...res, data: await loadUncached(v.userId) };
}

/* ───────── 학생 보스 ───────── */

async function bossMaker() {
  const v = await getViewer();
  if (!v || v.role !== "student" || !v.enrollment) return null;
  const data = await loadUncached(v.userId);
  return {
    userId: v.userId,
    schoolId: v.schoolId,
    schoolYearId: v.enrollment.schoolYearId,
    grade: v.enrollment.grade,
    unlocked: data.progress.unlocked,
    coins: data.progress.coins,
  };
}

export async function startStudentBoss(track: Track, stage: number, title: string, prize: number) {
  const m = await bossMaker();
  return m ? issueStudentBoss(m, track, stage, title, prize) : NOT_LOGGED_IN;
}

export async function saveMyBoss(sub: BossSubmission & { timeline: [number, number][] }) {
  const m = await bossMaker();
  if (!m) return NOT_LOGGED_IN;
  const res = await saveStudentBoss(m, sub);
  if ("error" in res) return res;
  return { ...res, data: await loadUncached(m.userId) };
}

export async function retireMyBoss(bossId: string) {
  const v = await getViewer();
  if (!v) return NOT_LOGGED_IN;
  const res = await retireStudentBoss(bossId, { userId: v.userId, schoolId: v.schoolId });
  if ("error" in res) return res;
  return { ...res, data: await loadUncached(v.userId) };
}

/* ───────── 픽셀 아트 ───────── */

export async function savePixel(input: { title: string; bits: number; rows: string[] }) {
  const w = await who();
  return w ? savePixelArt(w, input) : NOT_LOGGED_IN;
}

export async function deleteMyPixel(id: string) {
  const w = await who();
  if (!w) return NOT_LOGGED_IN;
  await deletePixelArt(id, { studentId: w.userId });
  return { ok: true as const };
}

/* ───────── 주간 챌린지 ───────── */

export async function claimWeeklyReward(challengeId: string) {
  const w = await who();
  if (!w) return NOT_LOGGED_IN;
  const res = await claimWeekly(w.userId, challengeId);
  if ("error" in res) return res;
  return { ...res, data: await loadUncached(w.userId) };
}

/* ───────── 이진수 연습실 ───────── */

/** 단계 통과 기록: 앞 단계를 깼어야 하고, 처음 깰 때만 코인 */
export async function clearBinaryStage(n: number) {
  const w = await who();
  if (!w) return NOT_LOGGED_IN;
  if (!BINARY_STAGES.some((s) => s.n === n)) return { error: "없는 단계예요." };
  const data = await loadUncached(w.userId);
  if (n > 1 && !data.progress.cleared.includes(`binary-${n - 1}`)) return { error: `${n - 1}단계를 먼저 깨 주세요.` };
  const ins = await createAdminClient().from("level_clears").insert({ student_id: w.userId, track: "binary", level: n });
  const first = !ins.error;
  if (first) await addCoins(w.userId, BINARY_FIRST_CLEAR_COINS, `이진수 연습실 ${n}단계`);
  return { first, coins: first ? BINARY_FIRST_CLEAR_COINS : 0, data: await loadUncached(w.userId) };
}

/* ───────── 영단어 연구소 ───────── */

/** 이번 주 단어 + 틀린 단어장 */
export async function vocabStatus() {
  const w = await who();
  if (!w) return NOT_LOGGED_IN;
  const [week, notebook] = await Promise.all([loadVocabWeek(w.userId), loadNotebook(w.userId)]);
  return { week, notebook };
}

/** 빈칸 채우기·듣고 쓰기·단어장 복습의 답 (틀린 단어장에 넣고 빼기) */
export async function vocabAnswers(answers: VocabAnswer[]) {
  const w = await who();
  if (!w) return NOT_LOGGED_IN;
  await recordAnswers(w.userId, Array.isArray(answers) ? answers : []);
  return { ok: true as const };
}

/** 빈칸 채우기·듣고 쓰기 묶음 하나를 끝냈을 때 */
export async function vocabClear(kind: VocabClearKind, part: number) {
  const w = await who();
  if (!w) return NOT_LOGGED_IN;
  const res = await clearPart(w.userId, kind, part);
  if ("error" in res) return res;
  return { ...res, data: await loadUncached(w.userId) };
}

export async function vocabClaimWeek() {
  const w = await who();
  if (!w) return NOT_LOGGED_IN;
  const res = await claimVocabWeek(w.userId);
  if ("error" in res) return res;
  return { ...res, data: await loadUncached(w.userId) };
}
