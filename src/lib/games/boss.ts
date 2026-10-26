import "server-only";

// 보스전 (서버 전용): 선생님이 친 기록을 "보스 고스트"로 저장하고, 학생은 그 기록과 레이스해요.
// 연습과 같이 서버가 지문을 내주고(서명된 표), 결과를 받아 타수·정확도·시간을 다시 계산해요.

import { BOSS, GAME_COINS, INTEGRITY, TRACKS, type Track } from "@/config/game";
import { createAdminClient } from "@/lib/supabase/admin";
import { entersOf, linesKeystrokes } from "@/lib/typing/engine";
import { checkIntegrity, type IntegrityFlag } from "@/lib/typing/integrity";
import { buildRound, pickCode } from "@/lib/typing/passage";
import { stageName } from "@/lib/practice/stages";
import { getStageWithPassages } from "@/lib/practice/packStage";
import {
  addCoins,
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

type BossTicket = { u: string; g: "boss-rec" | "boss"; track: Track; h: string; s: number; b?: string; title?: string };

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
  const keystrokes = linesKeystrokes(sub.lines, typed, code, entersOf(sub.lines.length, sub.typedLines.length));
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

  // 고스트 기록: 시간 순서대로, 너무 많으면 줄여서 저장
  const total = sub.lines.reduce((n, l) => n + l.length, 0);
  let timeline = (sub.timeline ?? [])
    .filter(([ms, chars]) => Number.isFinite(ms) && Number.isFinite(chars) && ms >= 0 && ms <= r.durationMs + 1000)
    .map(([ms, chars]) => [Math.round(ms), Math.min(total, Math.max(0, Math.round(chars)))] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  if (timeline.length > 400) timeline = timeline.filter((_, i) => i % Math.ceil(timeline.length / 400) === 0);
  timeline.push([r.durationMs, total]);

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

export async function listBosses(userId: string, schoolId: string, includeInactive = false): Promise<BossSummary[]> {
  const admin = createAdminClient();
  let q = admin
    .from("boss_records")
    .select("id, title, track, cpm, accuracy, duration_ms, lines, active")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (!includeInactive) q = q.eq("active", true);
  const [{ data: bosses }, { data: defeats }] = await Promise.all([
    q,
    admin.from("boss_defeats").select("boss_id").eq("student_id", userId),
  ]);
  const won = new Set((defeats ?? []).map((d) => d.boss_id));
  return (bosses ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    track: b.track as Track,
    cpm: b.cpm,
    accuracy: Number(b.accuracy),
    durationMs: b.duration_ms,
    lineCount: (b.lines as string[]).length,
    defeated: won.has(b.id),
    active: b.active,
  }));
}

async function bossFor(bossId: string, schoolId: string) {
  const { data } = await createAdminClient()
    .from("boss_records")
    .select("id, title, track, lines, timeline, duration_ms, cpm, active")
    .eq("id", bossId)
    .eq("school_id", schoolId)
    .maybeSingle();
  return data;
}

export async function issueBossChallenge(who: Who, schoolId: string, bossId: string) {
  const boss = await bossFor(bossId, schoolId);
  if (!boss || !boss.active) return { error: "보스를 찾을 수 없어요." };
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
  if (!suspicious) {
    await addCoins(who.userId, GAME_COINS.play, "보스전 도전");
    coins += GAME_COINS.play;
  }
  if (win) {
    const d = await admin.from("boss_defeats").insert({ student_id: who.userId, boss_id: boss.id });
    firstWin = !d.error;
    if (firstWin) {
      await addCoins(who.userId, GAME_COINS.bossWin, `보스 격파: ${boss.title}`);
      coins += GAME_COINS.bossWin;
      if (who.classId) {
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

