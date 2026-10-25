import "server-only";

// 친구 대결 (서버 전용): 방 만들기 · 참가 · 시작 · 결과 저장.
// 실시간 진행률과 이모티콘은 Supabase Realtime 으로 브라우저끼리 주고받고,
// 누가 들어왔는지 · 언제 시작했는지 · 몇 등인지는 서버가 정해요 (CLAUDE.md: 대결 진행률은 서버에서 검증).

import { GAME_COINS, RACE, TRACKS, type RaceDifficulty, type Track } from "@/config/game";
import { getLevel } from "@/data/packs";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRound, pickCode } from "@/lib/typing/passage";
import { addCoins, hashLines, loadUncached, makeToken, readToken, refreshGrowth, type Who } from "@/lib/practice/server";
import type { PracticeData } from "@/lib/practice/types";
import { scoreRun, type BossSubmission } from "./boss";

type RaceTicket = { u: string; g: "race"; m: string; h: string; s: number; track: Track };

export type RacePlayer = { studentId: string; nickname: string; rank: number | null; finishedMs: number | null; cpm: number | null };

export type RaceInfo = {
  id: string;
  hostId: string;
  track: Track;
  status: "waiting" | "playing" | "done" | "void";
  startAt: number | null;
  players: RacePlayer[];
  /** 시작한 뒤에만 지문과 표를 줌 (미리 연습 못 하게) */
  lines?: string[];
  token?: string;
};

const admin = () => createAdminClient();

export async function createMatch(who: Who, track: Track, difficulty: RaceDifficulty) {
  if (!who.classId) return { error: "반에 들어가 있어야 대결할 수 있어요." };
  if (!TRACKS.includes(track) || !(difficulty in RACE.difficulty)) return { error: "트랙이나 난이도를 다시 골라 주세요." };
  const level = getLevel(track, RACE.difficulty[difficulty][track])!;
  const lines = level.mode === "code" ? pickCode(level).lines : buildRound(track, level);
  const { data, error } = await admin()
    .from("matches")
    .insert({ class_id: who.classId, host_id: who.userId, track, lines })
    .select("id")
    .single();
  if (error) return { error: "방을 만들지 못했어요. 다시 해 주세요." };
  await admin().from("match_players").insert({ match_id: data.id, student_id: who.userId });
  return { matchId: data.id as string };
}

async function matchRow(matchId: string) {
  const { data } = await admin()
    .from("matches")
    .select("id, class_id, host_id, track, lines, status, started_at")
    .eq("id", matchId)
    .maybeSingle();
  return data;
}

export async function joinMatch(who: Who, matchId: string) {
  const m = await matchRow(matchId);
  if (!m || m.class_id !== who.classId) return { error: "대결방을 찾을 수 없어요." };
  if (m.status !== "waiting") return { error: "이미 시작했거나 끝난 대결이에요." };
  const { count } = await admin().from("match_players").select("*", { count: "exact", head: true }).eq("match_id", matchId);
  if ((count ?? 0) >= RACE.maxPlayers) return { error: `대결은 최대 ${RACE.maxPlayers}명까지예요.` };
  await admin().from("match_players").upsert({ match_id: matchId, student_id: who.userId }, { ignoreDuplicates: true });
  return { ok: true };
}

export async function leaveMatch(who: Who, matchId: string) {
  const m = await matchRow(matchId);
  if (!m || m.status !== "waiting") return { ok: true };
  if (m.host_id === who.userId) await admin().from("matches").update({ status: "void" }).eq("id", matchId);
  else await admin().from("match_players").delete().eq("match_id", matchId).eq("student_id", who.userId);
  return { ok: true };
}

export async function startMatch(who: Who, matchId: string) {
  const m = await matchRow(matchId);
  if (!m || m.host_id !== who.userId) return { error: "방장만 시작할 수 있어요." };
  if (m.status !== "waiting") return { error: "이미 시작한 대결이에요." };
  const { count } = await admin().from("match_players").select("*", { count: "exact", head: true }).eq("match_id", matchId);
  if ((count ?? 0) < 2) return { error: "친구가 한 명 이상 들어와야 시작할 수 있어요." };
  const startAt = new Date(Date.now() + RACE.countdownMs).toISOString();
  await admin().from("matches").update({ status: "playing", started_at: startAt }).eq("id", matchId).eq("status", "waiting");
  return { startAt: new Date(startAt).getTime() };
}

/** 방 정보 (우리 반 학생만). 시작했고 내가 참가자면 지문과 표도 줌 */
export async function getMatch(who: Who, matchId: string): Promise<RaceInfo | { error: string }> {
  const m = await matchRow(matchId);
  if (!m || m.class_id !== who.classId) return { error: "대결방을 찾을 수 없어요." };
  const { data: rows } = await admin()
    .from("match_players")
    .select("student_id, rank, finished_ms, cpm, profiles!inner(nickname)")
    .eq("match_id", matchId)
    .order("joined_at");
  const players: RacePlayer[] = (rows ?? []).map((r) => ({
    studentId: r.student_id,
    nickname: (r.profiles as unknown as { nickname: string | null }).nickname ?? "친구",
    rank: r.rank,
    finishedMs: r.finished_ms,
    cpm: r.cpm,
  }));
  const info: RaceInfo = {
    id: m.id,
    hostId: m.host_id,
    track: m.track as Track,
    status: m.status,
    startAt: m.started_at ? new Date(m.started_at).getTime() : null,
    players,
  };
  const joined = players.some((p) => p.studentId === who.userId);
  if (m.status === "playing" && joined && info.startAt) {
    const lines = m.lines as string[];
    const ticket: RaceTicket = { u: who.userId, g: "race", m: m.id, h: hashLines(lines), s: info.startAt, track: info.track };
    info.lines = lines;
    info.token = makeToken(ticket);
  }
  return info;
}

export type RaceResult = { rank: number | null; completed: boolean; cpm: number; accuracy: number; finishedMs: number; coins: number };

export async function submitRace(
  who: Who,
  sub: BossSubmission,
): Promise<{ result: RaceResult; data: PracticeData } | { error: string }> {
  const t = readToken<RaceTicket>(sub.token);
  if (!t || t.u !== who.userId || t.g !== "race") return { error: "대결 표가 올바르지 않아요." };
  if (t.h !== hashLines(sub.lines)) return { error: "지문이 바뀌었어요." };
  const m = await matchRow(t.m);
  if (!m || m.status === "void") return { error: "무효가 된 대결이에요." };

  const db = admin();
  const { data: me } = await db.from("match_players").select("rank, finished_ms").eq("match_id", m.id).eq("student_id", who.userId).maybeSingle();
  if (!me) return { error: "이 대결의 참가자가 아니에요." };
  if (me.finished_ms !== null) return { error: "이미 결과를 냈어요." };

  // 서버 시계로 잰 시간: 시작 시각부터 지금까지 (화면이 말한 시간보다 길면 서버 시간을 씀)
  const serverMs = Date.now() - t.s;
  const r = scoreRun(sub, serverMs + 3000, t.track);
  const finishedMs = Math.max(r.durationMs, serverMs - 2000);
  const valid = r.completed && r.flags.length === 0 && r.accuracy >= RACE.minAccuracy;

  // 등수: 유효하게 끝낸 사람 중 몇 번째로 서버에 도착했는지
  let rank: number | null = null;
  if (valid) {
    const { count } = await db.from("match_players").select("*", { count: "exact", head: true }).eq("match_id", m.id).not("rank", "is", null);
    rank = (count ?? 0) + 1;
  }
  await db
    .from("match_players")
    .update({ finished_ms: finishedMs, cpm: r.cpm, accuracy: r.accuracy, rank })
    .eq("match_id", m.id)
    .eq("student_id", who.userId);

  await db.from("attempts").insert({
    student_id: who.userId,
    class_id: who.classId,
    kind: "game",
    track: t.track,
    level: RACE.level,
    mode: "race",
    cpm: r.cpm,
    accuracy: r.accuracy,
    keystrokes: r.keystrokes,
    duration_ms: r.durationMs,
    missed_keys: {},
    flags: r.flags,
    suspicious: r.flags.length > 0,
    review_status: r.flags.length > 0 ? "pending" : "none",
    score: rank ?? 0,
  });

  let coins = 0;
  if (r.flags.length === 0) {
    await addCoins(who.userId, GAME_COINS.play, "친구 대결 참여");
    coins += GAME_COINS.play;
    if (rank === 1) {
      await addCoins(who.userId, GAME_COINS.raceWin, "친구 대결 1등");
      coins += GAME_COINS.raceWin;
    }
    await refreshGrowth(who);
  }

  // 모두 결과를 냈으면 대결 끝
  const { count: left } = await db.from("match_players").select("*", { count: "exact", head: true }).eq("match_id", m.id).is("finished_ms", null);
  if ((left ?? 0) === 0) await db.from("matches").update({ status: "done" }).eq("id", m.id);

  return {
    result: { rank, completed: r.completed, cpm: r.cpm, accuracy: r.accuracy, finishedMs, coins },
    data: await loadUncached(who.userId),
  };
}
