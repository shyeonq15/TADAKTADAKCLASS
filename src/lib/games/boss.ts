import "server-only";

// 보스전 (서버 전용): 선생님이 친 기록을 "보스 고스트"로 저장하고, 학생은 그 기록과 레이스해요.
// 연습과 같이 서버가 지문을 내주고(서명된 표), 결과를 받아 타수·정확도·시간을 다시 계산해요.

import { BOSS, GAME_COINS, INTEGRITY, STUDENT_BOSS, TIERS, TRACKS, type Tier, type Track } from "@/config/game";
import { cpmTier, higherTier } from "@/lib/scoring/tier";
import { isTestStudent } from "@/lib/auth/testAccount";
import { createAdminClient } from "@/lib/supabase/admin";
import { linesKeystrokes } from "@/lib/typing/engine";
import { checkIntegrity, type IntegrityFlag } from "@/lib/typing/integrity";
import { buildRound, pickCode } from "@/lib/typing/passage";
import { stageName, tierOfStage } from "@/lib/practice/stages";
import { getStageWithPassages } from "@/lib/practice/packStage";
import {
  addCoins,
  addGamePlayCoins,
  hashLines,
  loadUncached,
  makeToken,
  readToken,
  refreshGrowth,
  toAttempt,
  type AttemptRow,
  type Who,
} from "@/lib/practice/server";
import type { PracticeData } from "@/lib/practice/types";

type BossTicket = { u: string; g: "boss-rec" | "boss" | "boss-stu"; track: Track; h: string; s: number; b?: string; title?: string; prize?: number };

export type BossSummary = {
  id: string;
  title: string;
  track: Track;
  cpm: number;
  accuracy: number;
  durationMs: number;
  lineCount: number;
  defeated: boolean;
  active: boolean;
  /** 보스 난이도: 선생님 기록 타수로 매긴 티어 */
  tier: Tier;
  /** 학생 보스면 만든 학생 닉네임 (선생님 보스는 null) */
  maker: string | null;
  /** 내가 만든 보스인지 */
  mine: boolean;
  /** 학생 보스 상금: 한 명이 받는 코인, 남은 자리 */
  prizeEach: number;
  prizeLeft: number;
};

export type BossSubmission = {
  token: string;
  lines: string[];
  typedLines: string[];
  durationMs: number;
  totalErrors: number;
  totalCommitted: number;
  keyTimes: number[];
};

/** 끝난 판 다시 채점: 타수·정확도·다 쳤는지·시간 (연습과 같은 규칙). 친구 대결도 같이 씀 */
export function scoreRun(sub: BossSubmission, elapsed: number, track: Track) {
  let durationMs = Math.max(1000, Math.round(sub.durationMs));
  if (durationMs > elapsed + 3000) durationMs = elapsed;
  const typed = sub.lines.map((l, i) => String(sub.typedLines[i] ?? "").slice(0, l.length));
  // 코드 트랙은 화면처럼 들여쓰기 빼고 Enter 1타 (연습팩 규칙)
  const code = track === "code";
  const keystrokes = linesKeystrokes(sub.lines, typed, code, sub.typedLines.length);
  const cpm = Math.round(keystrokes / (durationMs / 60000));
  const typedChars = typed.reduce((n, t) => n + t.length, 0);
  const correct = typed.reduce((n, t, i) => n + [...t].filter((ch, j) => ch === sub.lines[i][j]).length, 0);
  const finalRatio = typedChars ? (correct / typedChars) * 100 : 0;
  const committed = Math.max(1, sub.totalCommitted);
  const reported = Math.max(0, ((committed - sub.totalErrors) / committed) * 100);
  const accuracy = Math.round(Math.min(reported, finalRatio) * 10) / 10;
  const completed = typed.every((t, i) => t.length === sub.lines[i].length);
  const flags = new Set<IntegrityFlag>(checkIntegrity(track, cpm, (sub.keyTimes ?? []).slice(0, 5000)));
  if (keystrokes > 40 && (sub.keyTimes?.length ?? 0) < keystrokes * 0.3) flags.add("too-regular");
  if (cpm > INTEGRITY.maxCpm[track]) flags.add("too-fast");
  return { durationMs, keystrokes, cpm, accuracy, completed, flags: [...flags] };
}

/** 고스트 기록: 시간 순서대로, 너무 많으면 줄여서 저장 */
function ghostTimeline(lines: string[], raw: [number, number][] | undefined, durationMs: number) {
  const total = lines.reduce((n, l) => n + l.length, 0);
  let timeline = (raw ?? [])
    .filter(([ms, chars]) => Number.isFinite(ms) && Number.isFinite(chars) && ms >= 0 && ms <= durationMs + 1000)
    .map(([ms, chars]) => [Math.round(ms), Math.min(total, Math.max(0, Math.round(chars)))] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  if (timeline.length > 400) timeline = timeline.filter((_, i) => i % Math.ceil(timeline.length / 400) === 0);
  timeline.push([durationMs, total]);
  return timeline;
}

/** 표나 칸이 아직 없을 때 (선생님이 SQL 을 아직 실행하지 않음) */
const missing = (e: { code?: string } | null) => !!e && ["42P01", "PGRST205", "42703", "PGRST204", "PGRST202"].includes(e.code ?? "");

/* ───────── 선생님: 보스 기록 만들기 ───────── */

export function issueBossRecording(teacherId: string, track: Track, stage: number, title: string) {
  if (!TRACKS.includes(track)) return { error: "트랙을 찾을 수 없어요." };
  const st = getStageWithPassages(track, stage);
  if (!st) return { error: "단계를 찾을 수 없어요." };
  const lines = st.level.mode === "code" ? pickCode(st.level).lines : buildRound(track, st.level);
  const name = title.trim().slice(0, 30) || `${stageName(stage)} 보스`;
  const ticket: BossTicket = { u: teacherId, g: "boss-rec", track, h: hashLines(lines), s: Date.now(), title: name };
  return { lines, token: makeToken(ticket) };
}

export async function saveBossRecording(
  teacher: { userId: string; schoolId: string },
  sub: BossSubmission & { timeline: [number, number][] },
) {
  const t = readToken<BossTicket>(sub.token);
  if (!t || t.u !== teacher.userId || t.g !== "boss-rec") return { error: "기록 표가 올바르지 않아요. 다시 해 주세요." };
  if (t.h !== hashLines(sub.lines)) return { error: "지문이 바뀌었어요. 다시 해 주세요." };
  const r = scoreRun(sub, Date.now() - t.s, t.track);
  if (!r.completed) return { error: "끝까지 다 쳐야 보스 기록이 돼요." };

  const timeline = ghostTimeline(sub.lines, sub.timeline, r.durationMs);

  const { error } = await createAdminClient().from("boss_records").insert({
    school_id: teacher.schoolId,
    teacher_id: teacher.userId,
    title: t.title ?? "선생님 보스",
    track: t.track,
    lines: sub.lines,
    timeline,
    duration_ms: r.durationMs,
    cpm: r.cpm,
    accuracy: r.accuracy,
  });
  if (error) return { error: "저장하지 못했어요. 다시 해 주세요." };
  return { ok: true, cpm: r.cpm, accuracy: r.accuracy, durationMs: r.durationMs };
}

/* ───────── 학생: 보스 목록·도전 ───────── */

type BossRow = {
  id: string;
  title: string;
  track: string;
  cpm: number;
  accuracy: number | string;
  duration_ms: number;
  lines: string[];
  active: boolean;
  student_id?: string | null;
  grade?: number | null;
  school_year_id?: string | null;
  prize?: number;
  prize_paid?: number;
};

/**
 * 보스 목록. 학생 보스는 같은 학년도·같은 학년 것만 보여요 (scope 없으면 = 선생님 화면: 학교 전체).
 * 학생 보스 칸이 아직 없으면(SQL 전) 선생님 보스만.
 */
export async function listBosses(
  userId: string,
  schoolId: string,
  includeInactive = false,
  scope?: { schoolYearId: string; grade: number } | null,
): Promise<BossSummary[]> {
  const admin = createAdminClient();
  const query = (cols: string) => {
    let q = admin.from("boss_records").select(cols).eq("school_id", schoolId).order("created_at", { ascending: false });
    if (!includeInactive) q = q.eq("active", true);
    return q;
  };
  const base = "id, title, track, cpm, accuracy, duration_ms, lines, active";
  let res = await query(`${base}, student_id, grade, school_year_id, prize, prize_paid`);
  if (res.error) res = await query(base);
  const rows = ((res.data ?? []) as unknown as BossRow[]).filter(
    (b) => !b.student_id || !scope || (b.grade === scope.grade && b.school_year_id === scope.schoolYearId),
  );
  const makerIds = [...new Set(rows.map((b) => b.student_id).filter(Boolean))] as string[];
  const [{ data: defeats }, { data: makers }] = await Promise.all([
    admin.from("boss_defeats").select("boss_id").eq("student_id", userId),
    makerIds.length
      ? admin.from("profiles").select("id, nickname").in("id", makerIds)
      : Promise.resolve({ data: [] as { id: string; nickname: string | null }[] }),
  ]);
  const won = new Set((defeats ?? []).map((d) => d.boss_id));
  const nick = new Map((makers ?? []).map((m) => [m.id, m.nickname ?? "친구"]));
  return rows.map((b) => ({
    id: b.id,
    title: b.title,
    track: b.track as Track,
    cpm: b.cpm,
    accuracy: Number(b.accuracy),
    durationMs: b.duration_ms,
    lineCount: b.lines.length,
    defeated: won.has(b.id),
    active: b.active,
    tier: cpmTier(b.track as Track, b.cpm),
    maker: b.student_id ? (nick.get(b.student_id) ?? "친구") : null,
    mine: b.student_id === userId,
    prizeEach: b.student_id ? Math.floor((b.prize ?? 0) / STUDENT_BOSS.winners) : 0,
    prizeLeft: b.student_id ? Math.max(0, STUDENT_BOSS.winners - (b.prize_paid ?? 0)) : 0,
  }));
}

export type BossRank = { tier: Tier | null; defeated: number };

/** 학생들의 보스 티어: 격파한 보스 중 가장 높은 티어 + 격파한 보스 수 */
export async function bossRanks(studentIds: string[]): Promise<Map<string, BossRank>> {
  const out = new Map<string, BossRank>();
  if (!studentIds.length) return out;
  // 학생 보스는 보스 티어에 넣지 않아요 (친구끼리 느린 보스를 주고받는 것 막기)
  const admin = createAdminClient();
  let res = await admin.from("boss_defeats").select("student_id, boss_records!inner(track, cpm, student_id)").in("student_id", studentIds);
  if (res.error) res = (await admin.from("boss_defeats").select("student_id, boss_records!inner(track, cpm)").in("student_id", studentIds)) as typeof res;
  type B = { track: string; cpm: number; student_id?: string | null };
  type Row = { student_id: string; boss_records: B | B[] };
  for (const d of (res.data ?? []) as unknown as Row[]) {
    const b = Array.isArray(d.boss_records) ? d.boss_records[0] : d.boss_records;
    if (!b || b.student_id) continue;
    const cur = out.get(d.student_id) ?? { tier: null, defeated: 0 };
    out.set(d.student_id, { tier: higherTier(cur.tier, cpmTier(b.track as Track, b.cpm)), defeated: cur.defeated + 1 });
  }
  return out;
}

type BossFull = {
  id: string;
  title: string;
  track: string;
  lines: string[];
  timeline: [number, number][];
  duration_ms: number;
  cpm: number;
  active: boolean;
  student_id?: string | null;
};

async function bossFor(bossId: string, schoolId: string): Promise<BossFull | null> {
  const admin = createAdminClient();
  const cols = "id, title, track, lines, timeline, duration_ms, cpm, active";
  let res = await admin.from("boss_records").select(`${cols}, student_id`).eq("id", bossId).eq("school_id", schoolId).maybeSingle();
  if (res.error) res = (await admin.from("boss_records").select(cols).eq("id", bossId).eq("school_id", schoolId).maybeSingle()) as typeof res;
  return res.data as BossFull | null;
}

export async function issueBossChallenge(who: Who, schoolId: string, bossId: string) {
  const boss = await bossFor(bossId, schoolId);
  if (!boss || !boss.active) return { error: "보스를 찾을 수 없어요." };
  if (boss.student_id === who.userId) return { error: "내가 만든 보스에는 도전할 수 없어요. 친구들의 도전을 기다려요!" };
  const lines = boss.lines as string[];
  const ticket: BossTicket = { u: who.userId, g: "boss", track: boss.track as Track, h: hashLines(lines), s: Date.now(), b: boss.id };
  return {
    lines,
    token: makeToken(ticket),
    track: boss.track as Track,
    title: boss.title as string,
    timeline: boss.timeline as [number, number][],
    durationMs: boss.duration_ms as number,
    cpm: boss.cpm as number,
  };
}

export type BossResult = {
  win: boolean;
  firstWin: boolean;
  completed: boolean;
  cpm: number;
  accuracy: number;
  durationMs: number;
  bossDurationMs: number;
  coins: number;
  classCoins: number;
  suspicious: boolean;
};

export async function saveBossChallenge(
  who: Who,
  schoolId: string,
  sub: BossSubmission,
): Promise<{ result: BossResult; data: PracticeData } | { error: string }> {
  const t = readToken<BossTicket>(sub.token);
  if (!t || t.u !== who.userId || t.g !== "boss" || !t.b) return { error: "도전 표가 올바르지 않아요. 다시 해 주세요." };
  if (t.h !== hashLines(sub.lines)) return { error: "지문이 바뀌었어요. 다시 해 주세요." };
  const boss = await bossFor(t.b, schoolId);
  if (!boss) return { error: "보스를 찾을 수 없어요." };

  const admin = createAdminClient();
  const { count } = await admin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", who.userId)
    .gt("created_at", new Date(t.s).toISOString());
  if ((count ?? 0) > 0) return { error: "이미 저장한 판이에요." };

  const r = scoreRun(sub, Date.now() - t.s, t.track);
  const suspicious = r.flags.length > 0;
  const win = !suspicious && r.completed && r.accuracy >= BOSS.minAccuracy && r.durationMs < boss.duration_ms;

  const ins = await admin
    .from("attempts")
    .insert({
      student_id: who.userId,
      class_id: who.classId,
      kind: "game",
      track: t.track,
      level: BOSS.level,
      mode: "boss",
      cpm: r.cpm,
      accuracy: r.accuracy,
      keystrokes: r.keystrokes,
      duration_ms: r.durationMs,
      missed_keys: {},
      flags: r.flags,
      suspicious,
      review_status: suspicious ? "pending" : "none",
      score: win ? 1 : 0,
    })
    .select("*")
    .single();
  if (ins.error) return { error: "기록을 저장하지 못했어요. 다시 해 주세요." };
  toAttempt(ins.data as AttemptRow);

  let coins = 0;
  let classCoins = 0;
  let firstWin = false;
  // 참여 코인은 끝까지 제대로 쳤을 때만 (스페이스만 눌러 빨리 끝내는 판은 코인 없음)
  if (!suspicious && r.completed && r.accuracy >= GAME_COINS.playMinAccuracy) {
    coins += await addGamePlayCoins(who.userId, "boss");
  }
  if (win) {
    const d = await admin.from("boss_defeats").insert({ student_id: who.userId, boss_id: boss.id });
    firstWin = !d.error;
    if (firstWin && boss.student_id) {
      // 학생 보스: 만든 친구가 건 상금에서 선착순으로 (보스 격파 보상·반 지갑은 선생님 보스만)
      const { data: paid } = await admin.rpc("claim_boss_prize", {
        p_boss: boss.id,
        p_student: who.userId,
        p_slots: STUDENT_BOSS.winners,
        p_reason: `학생 보스 상금: ${boss.title}`,
      });
      coins += Number(paid ?? 0);
    } else if (firstWin) {
      await addCoins(who.userId, GAME_COINS.bossWin, `보스 격파: ${boss.title}`);
      coins += GAME_COINS.bossWin;
      if (who.classId && !(await isTestStudent(who.userId))) {
        const { data: c } = await admin.from("classes").select("coins").eq("id", who.classId).single();
        await admin.from("classes").update({ coins: (c?.coins ?? 0) + GAME_COINS.bossClass }).eq("id", who.classId);
        await admin.from("coin_transactions").insert({ class_id: who.classId, student_id: who.userId, amount: GAME_COINS.bossClass, reason: "보스 격파" });
        classCoins = GAME_COINS.bossClass;
      }
    }
  }
  if (!suspicious) await refreshGrowth(who);

  return {
    result: {
      win,
      firstWin,
      completed: r.completed,
      cpm: r.cpm,
      accuracy: r.accuracy,
      durationMs: r.durationMs,
      bossDurationMs: boss.duration_ms,
      coins,
      classCoins,
      suspicious,
    },
    data: await loadUncached(who.userId),
  };
}



/* ───────── 학생 보스 만들기 (레전드 이상) ───────── */

const BANNED_TITLE = ["시발", "씨발", "병신", "개새", "존나", "좆", "fuck", "shit", "바보", "멍청", "꼴찌", "느림보"];

export type StudentBossMaker = {
  userId: string;
  schoolId: string;
  schoolYearId: string;
  grade: number;
  unlocked: Record<Track, number>;
  coins: number;
};

/** 이 트랙에서 학생 보스를 만들 수 있는지 (티어 조건) */
export const canMakeBoss = (unlocked: Record<Track, number>, track: Track) =>
  TIERS.indexOf(tierOfStage(unlocked[track])) >= TIERS.indexOf(STUDENT_BOSS.minTier);

export function issueStudentBoss(m: StudentBossMaker, track: Track, stage: number, title: string, prize: number) {
  if (!TRACKS.includes(track)) return { error: "트랙을 찾을 수 없어요." };
  if (!canMakeBoss(m.unlocked, track)) return { error: "이 트랙 레전드 이상만 보스를 만들 수 있어요." };
  if (!Number.isInteger(stage) || stage < 1 || stage > m.unlocked[track]) return { error: "열린 단계의 글로만 만들 수 있어요." };
  if (!Number.isInteger(prize) || prize < STUDENT_BOSS.minPrize || prize > STUDENT_BOSS.maxPrize || prize % STUDENT_BOSS.prizeStep !== 0)
    return { error: `상금은 ${STUDENT_BOSS.minPrize}~${STUDENT_BOSS.maxPrize}코인, ${STUDENT_BOSS.prizeStep}코인 단위로 걸어요.` };
  if (prize > m.coins) return { error: "코인이 모자라요." };
  const name = title.trim().replace(/\s+/g, " ").slice(0, 20);
  if (name.length < 2) return { error: "보스 이름을 2글자 이상 써 주세요." };
  if (BANNED_TITLE.some((w) => name.toLowerCase().replace(/\s/g, "").includes(w))) return { error: "친구가 기분 좋을 이름으로 바꿔 볼까요?" };
  const st = getStageWithPassages(track, stage);
  if (!st) return { error: "단계를 찾을 수 없어요." };
  const lines = st.level.mode === "code" ? pickCode(st.level).lines : buildRound(track, st.level);
  const ticket: BossTicket = { u: m.userId, g: "boss-stu", track, h: hashLines(lines), s: Date.now(), title: name, prize };
  return { lines, token: makeToken(ticket) };
}

export async function saveStudentBoss(m: StudentBossMaker, sub: BossSubmission & { timeline: [number, number][] }) {
  const t = readToken<BossTicket>(sub.token);
  if (!t || t.u !== m.userId || t.g !== "boss-stu" || !t.prize) return { error: "기록 표가 올바르지 않아요. 다시 해 주세요." };
  if (t.h !== hashLines(sub.lines)) return { error: "지문이 바뀌었어요. 다시 해 주세요." };
  if (Date.now() - t.s > 30 * 60000) return { error: "시간이 너무 지났어요. 다시 해 주세요." };
  if (!canMakeBoss(m.unlocked, t.track)) return { error: "이 트랙 레전드 이상만 보스를 만들 수 있어요." };
  const r = scoreRun(sub, Date.now() - t.s, t.track);
  if (!r.completed) return { error: "끝까지 다 쳐야 보스가 돼요." };
  if (r.flags.length > 0) return { error: "이번 기록은 보스로 만들 수 없어요. 다시 쳐 주세요." };
  if (r.accuracy < STUDENT_BOSS.minAccuracy) return { error: `정확도 ${STUDENT_BOSS.minAccuracy}% 이상이어야 보스가 돼요. (이번 ${r.accuracy}%)` };

  const admin = createAdminClient();
  const spent = await admin.rpc("spend_wallet_coins", { p_student: m.userId, p_amount: t.prize, p_reason: `학생 보스 상금 걸기: ${t.title}` });
  if (spent.error) return { error: missing(spent.error) ? "학생 보스를 준비 중이에요. 선생님께 알려 주세요!" : "코인을 쓰지 못했어요. 다시 해 주세요." };
  if (spent.data === "poor") return { error: "코인이 모자라요." };

  // 트랙마다 1마리: 같은 트랙의 예전 보스는 내리고 남은 상금은 돌려받아요
  const { data: old } = await admin.from("boss_records").select("id").eq("student_id", m.userId).eq("track", t.track).eq("active", true);
  for (const o of old ?? []) await admin.rpc("retire_student_boss", { p_boss: o.id, p_slots: STUDENT_BOSS.winners });

  const { error } = await admin.from("boss_records").insert({
    school_id: m.schoolId,
    teacher_id: null,
    student_id: m.userId,
    school_year_id: m.schoolYearId,
    grade: m.grade,
    prize: t.prize,
    title: t.title ?? "친구 보스",
    track: t.track,
    lines: sub.lines,
    timeline: ghostTimeline(sub.lines, sub.timeline, r.durationMs),
    duration_ms: r.durationMs,
    cpm: r.cpm,
    accuracy: r.accuracy,
  });
  if (error) {
    await addCoins(m.userId, t.prize, "학생 보스 상금 돌려받기 (저장 실패)");
    return { error: "저장하지 못했어요. 다시 해 주세요." };
  }
  return { ok: true as const, cpm: r.cpm, accuracy: r.accuracy, durationMs: r.durationMs, tier: cpmTier(t.track, r.cpm) };
}

/** 학생 보스 내리기 (남은 상금은 만든 학생에게). by.userId 가 있으면 그 학생 보스만, 없으면 선생님 */
export async function retireStudentBoss(bossId: string, by: { userId?: string; schoolId: string }) {
  const admin = createAdminClient();
  let q = admin.from("boss_records").select("id").eq("id", bossId).eq("school_id", by.schoolId).not("student_id", "is", null);
  if (by.userId) q = q.eq("student_id", by.userId);
  const { data } = await q.maybeSingle();
  if (!data) return { error: "보스를 찾을 수 없어요." };
  const { data: refund } = await admin.rpc("retire_student_boss", { p_boss: bossId, p_slots: STUDENT_BOSS.winners });
  return { ok: true as const, refund: Number(refund ?? 0) };
}
