import "server-only";

// 친구 대결 (서버 전용): 방 만들기 · 참가 · 시작 · 결과 저장 · 3판 2선승 · 레이팅 · 자동 매치.
// 실시간 진행률과 이모티콘은 Supabase Realtime 으로 브라우저끼리 주고받고,
// 누가 들어왔는지 · 언제 시작했는지 · 몇 등인지는 서버가 정해요 (CLAUDE.md: 대결 진행률은 서버에서 검증).
//
// 시리즈: 한 판 = matches 한 줄, 같은 시리즈는 series_id 가 같아요. 판이 끝나면 서버가 다음 판을 만들어요.

import { randomUUID } from "node:crypto";
import { GAME_COINS, RACE, TRACKS, type RaceDifficulty, type RaceMode, type Track } from "@/config/game";
import type { MinimiLook } from "@/config/shop";
import { getLevel } from "@/data/packs";
import { addCoins, hashLines, loadUncached, makeToken, readToken, refreshGrowth, type Who } from "@/lib/practice/server";
import type { PracticeData } from "@/lib/practice/types";
import { median } from "@/lib/scoring/growth";
import { loadLooks } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildRound, pickCode } from "@/lib/typing/passage";
import { scoreRun, type BossSubmission } from "./boss";

type RaceTicket = { u: string; g: "race"; m: string; h: string; s: number; track: Track };

export type RacePlayer = {
  studentId: string;
  nickname: string;
  rank: number | null;
  finishedMs: number | null;
  cpm: number | null;
  /** 성장 모드: 내 평균 대비 % */
  growthPct: number | null;
  /** 이 시리즈에서 이긴 판 수 */
  wins: number;
  /** 시리즈가 끝났을 때 레이팅 변화 (클래식만) */
  ratingDelta: number | null;
  rating: number;
  /** 상점에서 꾸민 미니미 */
  look?: MinimiLook;
};

export type RaceInfo = {
  id: string;
  seriesId: string;
  round: number;
  mode: RaceMode;
  hostId: string;
  track: Track;
  status: "waiting" | "playing" | "done" | "void";
  startAt: number | null;
  seriesDone: boolean;
  /** 다음 판이 만들어졌으면 */
  next: { matchId: string; startAt: number } | null;
  players: RacePlayer[];
  /** 시작한 뒤에만 지문과 표를 줌 (미리 연습 못 하게) */
  lines?: string[];
  token?: string;
};

const admin = () => createAdminClient();

type MatchRow = {
  id: string;
  class_id: string;
  host_id: string;
  track: string;
  lines: string[];
  status: RaceInfo["status"];
  started_at: string | null;
  series_id: string | null;
  round: number;
  mode: RaceMode;
  difficulty: RaceDifficulty;
  series_done: boolean;
};

async function matchRow(matchId: string): Promise<MatchRow | null> {
  const { data } = await admin()
    .from("matches")
    .select("id, class_id, host_id, track, lines, status, started_at, series_id, round, mode, difficulty, series_done")
    .eq("id", matchId)
    .maybeSingle();
  return (data as MatchRow | null) ?? null;
}

function roundLines(track: Track, difficulty: RaceDifficulty) {
  const level = getLevel(track, RACE.difficulty[difficulty][track])!;
  return level.mode === "code" ? pickCode(level).lines : buildRound(track, level);
}

/* ───────── 레이팅 ───────── */

async function ratingsOf(ids: string[]): Promise<Map<string, number>> {
  const { data } = ids.length ? await admin().from("race_ratings").select("student_id, rating").in("student_id", ids) : { data: [] };
  const map = new Map<string, number>((data ?? []).map((r) => [r.student_id, r.rating]));
  for (const id of ids) if (!map.has(id)) map.set(id, RACE.rating.start);
  return map;
}

export async function myRating(userId: string) {
  return (await ratingsOf([userId])).get(userId)!;
}

/** 여러 명 Elo: 둘씩 비교해서 더하고, 인원으로 나눠요. place 가 작을수록 잘한 것 */
export function eloDeltas(players: { id: string; rating: number; place: number }[]): Map<string, number> {
  const n = players.length;
  const out = new Map<string, number>();
  for (const a of players) {
    let d = 0;
    for (const b of players) {
      if (a.id === b.id) continue;
      const score = a.place < b.place ? 1 : a.place === b.place ? 0.5 : 0;
      const expected = 1 / (1 + 10 ** ((b.rating - a.rating) / 400));
      d += (RACE.rating.k / Math.max(1, n - 1)) * (score - expected);
    }
    out.set(a.id, Math.round(d));
  }
  return out;
}

/* ───────── 방 ───────── */

export async function createMatch(who: Who, track: Track, difficulty: RaceDifficulty, mode: RaceMode = "classic") {
  if (!who.classId) return { error: "반에 들어가 있어야 대결할 수 있어요." };
  if (!TRACKS.includes(track) || !(difficulty in RACE.difficulty) || !(mode === "classic" || mode === "growth"))
    return { error: "트랙이나 난이도를 다시 골라 주세요." };
  const id = randomUUID();
  const { error } = await admin()
    .from("matches")
    .insert({ id, series_id: id, round: 1, mode, difficulty, class_id: who.classId, host_id: who.userId, track, lines: roundLines(track, difficulty) });
  if (error) return { error: "방을 만들지 못했어요. 다시 해 주세요." };
  await admin().from("match_players").insert({ match_id: id, student_id: who.userId });
  return { matchId: id };
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

/** 나가기: 기다리는 방이면 빠지고(방장이면 방 닫기), 진행 중인 판이면 그 판에서 빠져요 */
export async function leaveMatch(who: Who, matchId: string) {
  const m = await matchRow(matchId);
  if (!m) return { ok: true };
  if (m.status === "waiting") {
    if (m.host_id === who.userId) await admin().from("matches").update({ status: "void" }).eq("id", matchId);
    else await admin().from("match_players").delete().eq("match_id", matchId).eq("student_id", who.userId);
  } else if (m.status === "playing") {
    await admin().from("match_players").delete().eq("match_id", matchId).eq("student_id", who.userId).is("finished_ms", null);
    await finishIfAllDone(matchId);
  }
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

/* ───────── 판 정리 · 다음 판 · 시리즈 끝 ───────── */

type PlayerRow = {
  match_id: string;
  student_id: string;
  rank: number | null;
  finished_ms: number | null;
  cpm: number | null;
  growth_pct: number | string | null;
  rating_delta: number | null;
};

async function finishIfAllDone(matchId: string) {
  const { count } = await admin().from("match_players").select("*", { count: "exact", head: true }).eq("match_id", matchId).is("finished_ms", null);
  if ((count ?? 0) === 0) await finalizeRound(matchId);
}

/** 시리즈의 모든 판 기록 */
async function seriesRows(seriesId: string) {
  const { data: rounds } = await admin().from("matches").select("id, round, status").eq("series_id", seriesId).order("round");
  const ids = (rounds ?? []).map((r) => r.id);
  const { data: rows } = ids.length
    ? await admin().from("match_players").select("match_id, student_id, rank, finished_ms, cpm, growth_pct, rating_delta").in("match_id", ids)
    : { data: [] };
  return { rounds: rounds ?? [], rows: (rows ?? []) as PlayerRow[] };
}

function standings(rows: PlayerRow[]) {
  const wins = new Map<string, number>();
  const time = new Map<string, number>();
  for (const r of rows) {
    wins.set(r.student_id, (wins.get(r.student_id) ?? 0) + (r.rank === 1 ? 1 : 0));
    time.set(r.student_id, (time.get(r.student_id) ?? 0) + (r.rank !== null && r.finished_ms !== null ? r.finished_ms : RACE.roundMaxMs));
  }
  return { wins, time };
}

/** 한 판 끝: 성장 모드 등수 매기기 → 시리즈가 끝났으면 우승·레이팅, 아니면 다음 판 만들기. 한 번만 실행돼요 */
async function finalizeRound(matchId: string) {
  const db = admin();
  const { data: closed } = await db.from("matches").update({ status: "done" }).eq("id", matchId).eq("status", "playing").select("id");
  if (!closed?.length) return; // 누가 먼저 정리했어요
  const m = (await matchRow(matchId))!;
  const seriesId = m.series_id ?? m.id;

  if (m.mode === "growth") {
    const { data } = await db.from("match_players").select("student_id, growth_pct").eq("match_id", matchId).not("growth_pct", "is", null);
    const sorted = [...(data ?? [])].sort((a, b) => Number(b.growth_pct) - Number(a.growth_pct));
    for (const r of sorted) {
      const rank = sorted.findIndex((x) => Number(x.growth_pct) === Number(r.growth_pct)) + 1;
      await db.from("match_players").update({ rank }).eq("match_id", matchId).eq("student_id", r.student_id);
    }
  }

  const { rows } = await seriesRows(seriesId);
  const { wins, time } = standings(rows);
  const thisRound = rows.filter((r) => r.match_id === matchId);
  const stillIn = thisRound.filter((r) => r.finished_ms !== null).map((r) => r.student_id);
  const topWins = Math.max(0, ...wins.values());
  const over = topWins >= RACE.winsNeeded || m.round >= RACE.maxRounds || stillIn.length < 2;

  if (!over) {
    const nextId = randomUUID();
    const startAt = new Date(Date.now() + RACE.resultPauseMs + RACE.countdownMs).toISOString();
    const { error } = await db.from("matches").insert({
      id: nextId,
      series_id: seriesId,
      round: m.round + 1,
      mode: m.mode,
      difficulty: m.difficulty,
      class_id: m.class_id,
      host_id: m.host_id,
      track: m.track,
      lines: roundLines(m.track as Track, m.difficulty),
      status: "playing",
      started_at: startAt,
    });
    if (!error) await db.from("match_players").insert(stillIn.map((id) => ({ match_id: nextId, student_id: id })));
    return;
  }

  // 시리즈 끝: 이긴 판 수 → 걸린 시간 합 순서
  await db.from("matches").update({ series_done: true }).eq("id", matchId);
  const everyone = [...wins.keys()];
  const order = [...everyone].sort((a, b) => wins.get(b)! - wins.get(a)! || time.get(a)! - time.get(b)!);
  const placeOf = (id: string) => order.findIndex((x) => wins.get(x) === wins.get(id) && time.get(x) === time.get(id));
  const champion = order[0];
  if (champion && wins.get(champion)! > 0) await addCoins(champion, GAME_COINS.raceWin, "친구 대결 우승");

  if (m.mode === "classic" && everyone.length >= 2) {
    const ratings = await ratingsOf(everyone);
    const deltas = eloDeltas(everyone.map((id) => ({ id, rating: ratings.get(id)!, place: placeOf(id) })));
    const { data: prev } = await db.from("race_ratings").select("student_id, games").in("student_id", everyone);
    const games = new Map((prev ?? []).map((p) => [p.student_id, p.games]));
    await db.from("race_ratings").upsert(
      everyone.map((id) => ({
        student_id: id,
        rating: ratings.get(id)! + deltas.get(id)!,
        games: (games.get(id) ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })),
    );
    for (const id of everyone) {
      await db.from("match_players").update({ rating_delta: deltas.get(id)! }).eq("match_id", matchId).eq("student_id", id);
    }
  }
}

/** 제한 시간이 지난 판은 정리 (안 친 사람은 등수 없이) */
async function closeIfTimedOut(m: MatchRow) {
  if (m.status !== "playing" || !m.started_at) return false;
  if (Date.now() < new Date(m.started_at).getTime() + RACE.roundMaxMs) return false;
  await finalizeRound(m.id);
  return true;
}

/* ───────── 방 정보 ───────── */

/** 방 정보 (우리 반 학생만). 시작했고 내가 참가자면 지문과 표도 줌 */
export async function getMatch(who: Who, matchId: string): Promise<RaceInfo | { error: string }> {
  let m = await matchRow(matchId);
  if (!m || m.class_id !== who.classId) return { error: "대결방을 찾을 수 없어요." };
  if (await closeIfTimedOut(m)) m = (await matchRow(matchId))!;
  const seriesId = m.series_id ?? m.id;

  const db = admin();
  const [{ data: rows }, series, { data: next }] = await Promise.all([
    db
      .from("match_players")
      .select("student_id, rank, finished_ms, cpm, growth_pct, rating_delta, profiles!inner(nickname)")
      .eq("match_id", matchId)
      .order("joined_at"),
    seriesRows(seriesId),
    db.from("matches").select("id, started_at").eq("series_id", seriesId).eq("round", m.round + 1).maybeSingle(),
  ]);
  const { wins } = standings(series.rows);
  const ids = (rows ?? []).map((r) => r.student_id);
  const [looks, ratings] = await Promise.all([loadLooks(ids), ratingsOf(ids)]);
  const players: RacePlayer[] = (rows ?? []).map((r) => ({
    studentId: r.student_id,
    nickname: (r.profiles as unknown as { nickname: string | null }).nickname ?? "친구",
    rank: r.rank,
    finishedMs: r.finished_ms,
    cpm: r.cpm,
    growthPct: r.growth_pct === null ? null : Number(r.growth_pct),
    wins: wins.get(r.student_id) ?? 0,
    ratingDelta: r.rating_delta,
    rating: ratings.get(r.student_id)!,
    look: looks[r.student_id] ?? {},
  }));

  const info: RaceInfo = {
    id: m.id,
    seriesId,
    round: m.round,
    mode: m.mode,
    hostId: m.host_id,
    track: m.track as Track,
    status: m.status,
    startAt: m.started_at ? new Date(m.started_at).getTime() : null,
    seriesDone: m.series_done,
    next: next?.started_at ? { matchId: next.id, startAt: new Date(next.started_at).getTime() } : null,
    players,
  };
  const joined = players.some((p) => p.studentId === who.userId);
  if (m.status === "playing" && joined && info.startAt) {
    const ticket: RaceTicket = { u: who.userId, g: "race", m: m.id, h: hashLines(m.lines), s: info.startAt, track: info.track };
    info.lines = m.lines;
    info.token = makeToken(ticket);
  }
  return info;
}

/* ───────── 결과 저장 ───────── */

export type RaceResult = {
  rank: number | null;
  completed: boolean;
  cpm: number;
  accuracy: number;
  finishedMs: number;
  coins: number;
  growthPct: number | null;
};

export async function submitRace(
  who: Who,
  sub: BossSubmission,
): Promise<{ result: RaceResult; data: PracticeData } | { error: string }> {
  const t = readToken<RaceTicket>(sub.token);
  if (!t || t.u !== who.userId || t.g !== "race") return { error: "대결 표가 올바르지 않아요." };
  if (t.h !== hashLines(sub.lines)) return { error: "지문이 바뀌었어요." };
  const m = await matchRow(t.m);
  if (!m || m.status === "void") return { error: "무효가 된 대결이에요." };
  if (m.status === "done") return { error: "제한 시간이 지나서 이 판은 끝났어요." };

  const db = admin();
  const { data: me } = await db.from("match_players").select("rank, finished_ms").eq("match_id", m.id).eq("student_id", who.userId).maybeSingle();
  if (!me) return { error: "이 대결의 참가자가 아니에요." };
  if (me.finished_ms !== null) return { error: "이미 결과를 냈어요." };

  // 서버 시계로 잰 시간: 시작 시각부터 지금까지 (화면이 말한 시간보다 길면 서버 시간을 씀)
  const serverMs = Date.now() - t.s;
  const r = scoreRun(sub, serverMs + 3000, t.track);
  const finishedMs = Math.max(r.durationMs, serverMs - 2000);
  const valid = r.completed && r.flags.length === 0 && r.accuracy >= RACE.minAccuracy;
  const before = await loadUncached(who.userId);

  // 클래식: 유효하게 끝낸 사람 중 몇 번째로 서버에 도착했는지
  // 성장 모드: 내 최근 기록(같은 트랙 5회 중앙값) 대비 % → 판이 끝날 때 등수를 매겨요
  let rank: number | null = null;
  let growthPct: number | null = null;
  if (valid && m.mode === "classic") {
    const { count } = await db.from("match_players").select("*", { count: "exact", head: true }).eq("match_id", m.id).not("rank", "is", null);
    rank = (count ?? 0) + 1;
  }
  if (valid && m.mode === "growth") {
    const recent = before.attempts.filter((a) => a.track === t.track && !a.suspicious && a.kind !== "placement").slice(-5);
    const base = recent.length ? median(recent.map((a) => a.cpm)) : (before.progress.placement?.[t.track] ?? 0);
    growthPct = base > 0 ? Math.round(((r.cpm - base) / base) * 1000) / 10 : 0;
  }
  await db
    .from("match_players")
    .update({ finished_ms: finishedMs, cpm: r.cpm, accuracy: r.accuracy, rank, growth_pct: growthPct })
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
    await refreshGrowth(who);
  }

  await finishIfAllDone(m.id);

  return {
    result: { rank, completed: r.completed, cpm: r.cpm, accuracy: r.accuracy, finishedMs, coins, growthPct },
    data: await loadUncached(who.userId),
  };
}

/* ───────── 자동 매치 ───────── */

export type QueueStatus = { matchId: string } | { waiting: true; waitedSec: number; range: number | null; rating: number };

/** 대결 찾기: 화면이 2초마다 불러요. 같은 반·같은 트랙에서 레이팅이 가까운 친구와 1:1 */
export async function queueMatch(who: Who, track: Track): Promise<QueueStatus | { error: string }> {
  if (!who.classId) return { error: "반에 들어가 있어야 대결할 수 있어요." };
  if (!TRACKS.includes(track)) return { error: "트랙을 다시 골라 주세요." };
  const db = admin();
  const now = Date.now();
  const rating = await myRating(who.userId);

  const { data: mine, error } = await db.from("match_queue").select("track, joined_at, match_id").eq("student_id", who.userId).maybeSingle();
  if (error) return { error: "자동 매치 준비가 아직 안 됐어요. 선생님께 알려 주세요." };
  if (mine?.match_id) {
    const m = await matchRow(mine.match_id);
    if (m && (m.status === "playing" || m.status === "waiting")) {
      await db.from("match_queue").delete().eq("student_id", who.userId);
      return { matchId: m.id };
    }
  }
  const fresh = !mine || mine.track !== track || !!mine.match_id;
  const joinedAt = fresh ? now : new Date(mine!.joined_at).getTime();
  await db.from("match_queue").upsert({
    student_id: who.userId,
    class_id: who.classId,
    track,
    rating,
    joined_at: new Date(joinedAt).toISOString(),
    seen_at: new Date(now).toISOString(),
    match_id: null,
  });

  const waitedSec = Math.floor((now - joinedAt) / 1000);
  const range = waitedSec >= RACE.queue.anyAfterSec ? null : RACE.queue.base + RACE.queue.perSecond * waitedSec;
  const { data: others } = await db
    .from("match_queue")
    .select("student_id, rating")
    .eq("class_id", who.classId)
    .eq("track", track)
    .is("match_id", null)
    .neq("student_id", who.userId)
    .gte("seen_at", new Date(now - RACE.queue.staleMs).toISOString());
  const pick = (others ?? [])
    .filter((o) => range === null || Math.abs(o.rating - rating) <= range)
    .sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))[0];
  if (!pick) return { waiting: true, waitedSec, range, rating };

  const id = randomUUID();
  const { data: paired } = await db.rpc("pair_queue", { p_a: who.userId, p_b: pick.student_id, p_match: id });
  if (!paired) return { waiting: true, waitedSec, range, rating };
  // 상대 화면이 소식을 받을 시간까지 넉넉히 두고 시작
  const startAt = new Date(now + RACE.countdownMs + RACE.queue.pollMs).toISOString();
  const { error: insertError } = await db.from("matches").insert({
    id,
    series_id: id,
    round: 1,
    mode: "classic",
    difficulty: "normal",
    class_id: who.classId,
    host_id: who.userId,
    track,
    lines: roundLines(track, "normal"),
    status: "playing",
    started_at: startAt,
  });
  if (insertError) {
    await db.from("match_queue").update({ match_id: null }).in("student_id", [who.userId, pick.student_id]);
    return { waiting: true, waitedSec, range, rating };
  }
  await db.from("match_players").insert([
    { match_id: id, student_id: who.userId },
    { match_id: id, student_id: pick.student_id },
  ]);
  await db.from("match_queue").delete().eq("student_id", who.userId);
  return { matchId: id };
}

export async function leaveQueue(who: Who) {
  await admin().from("match_queue").delete().eq("student_id", who.userId).is("match_id", null);
  return { ok: true };
}
