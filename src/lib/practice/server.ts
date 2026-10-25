import "server-only";

// 연습 기록 저장·점수·코인 계산 (서버 전용). CLAUDE.md: "점수·화폐 계산은 반드시 서버에서만"
//
// 흐름: issueRound(지문 + 서명된 표) → 학생이 침 → saveRound(표 확인 → 타수 다시 계산 → 저장)

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { BLANK_LEVEL, LESSON_LEVEL, LESSON_PASS_ACCURACY, COINS, INTEGRITY, LEVEL_CLEAR, MISSION, PACK_LEVEL, PLACEMENT, TRACKS, type Track } from "@/config/game";
import { schoolYearOf } from "@/lib/auth/config";
import { getLevel, maxLevel } from "@/data/packs";
import { createAdminClient } from "@/lib/supabase/admin";
import { dailyGrowth } from "@/lib/scoring/growth";
import { trackTier } from "@/lib/scoring/tier";
import { correctKeystrokes } from "@/lib/typing/engine";
import { checkIntegrity, type IntegrityFlag } from "@/lib/typing/integrity";
import { buildPlacementRound, buildRound, buildWeakKeyRound, pickCode } from "@/lib/typing/passage";
import { blankMask, codeNote, lesson } from "@/data/codeNotes";
import { dayKeyKST } from "./day";
import { recentMedian, streakDays, weakKeys } from "./derive";
import {
  EMPTY_DATA,
  type Attempt,
  type IssuedRound,
  type PracticeData,
  type RoundRequest,
  type RoundSubmission,
  type SaveResult,
  type TeacherPack,
} from "./types";

export type Who = { userId: string; classId: string | null };

/* ───────── 읽기 ───────── */

export type AttemptRow = {
  id: string;
  kind: Attempt["kind"];
  track: Track;
  level: number;
  mode: Attempt["mode"];
  cpm: number;
  accuracy: number | string;
  keystrokes: number;
  duration_ms: number;
  missed_keys: Record<string, number>;
  flags: IntegrityFlag[];
  suspicious: boolean;
  score: number | null;
  created_at: string;
};

export const toAttempt = (r: AttemptRow): Attempt => ({
  id: r.id,
  kind: r.kind,
  track: r.track,
  level: r.level,
  mode: r.mode,
  cpm: r.cpm,
  accuracy: Number(r.accuracy),
  keystrokes: r.keystrokes,
  durationMs: r.duration_ms,
  missedKeys: r.missed_keys ?? {},
  flags: r.flags ?? [],
  suspicious: r.suspicious,
  score: r.score ?? null,
  at: new Date(r.created_at).getTime(),
});

/** 학생 한 명의 기록·진행 상황 (저장 직후처럼 새로 읽어야 할 때 직접 부름) */
export async function loadUncached(userId: string): Promise<PracticeData> {
  const admin = createAdminClient();
  const [attempts, progress, clears, wallet, coinLog, classCoins, missions] = await Promise.all([
    admin.from("attempts").select("*").eq("student_id", userId).order("created_at", { ascending: false }).limit(300),
    admin.from("track_progress").select("track, unlocked_level, placement_cpm").eq("student_id", userId),
    admin.from("level_clears").select("track, level, cleared_at").eq("student_id", userId),
    admin.from("wallets").select("coins").eq("student_id", userId).maybeSingle(),
    admin
      .from("coin_transactions")
      .select("amount, reason, created_at")
      .eq("student_id", userId)
      .is("class_id", null)
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("coin_transactions").select("amount").eq("student_id", userId).not("class_id", "is", null),
    admin.from("mission_completions").select("day").eq("student_id", userId),
  ]);

  const unlocked = { ...EMPTY_DATA.progress.unlocked };
  const placementCpm: Partial<Record<Track, number>> = {};
  for (const p of progress.data ?? []) {
    unlocked[p.track as Track] = p.unlocked_level;
    if (p.placement_cpm !== null) placementCpm[p.track as Track] = p.placement_cpm;
  }
  const placement = TRACKS.every((t) => placementCpm[t] !== undefined) ? (placementCpm as Record<Track, number>) : null;

  return {
    attempts: ((attempts.data ?? []) as AttemptRow[]).map(toAttempt).reverse(),
    progress: {
      unlocked,
      cleared: (clears.data ?? []).map((c) => `${c.track}-${c.level}`),
      clearLog: (clears.data ?? []).map((c) => ({ id: `${c.track}-${c.level}`, at: new Date(c.cleared_at).getTime() })),
      placement,
      coins: wallet.data?.coins ?? 0,
      classCoins: (classCoins.data ?? []).reduce((n, c) => n + c.amount, 0),
      coinLog: (coinLog.data ?? [])
        .map((c) => ({ amount: c.amount, reason: c.reason, at: new Date(c.created_at).getTime() }))
        .reverse(),
      missionDays: (missions.data ?? []).map((m) => m.day),
    },
    packs: await loadPacks(userId),
  };
}

/** 이 학생이 볼 수 있는 선생님 연습팩: 우리 반에 배포된 것 (교사는 우리 학교 전체) */
async function loadPacks(userId: string): Promise<TeacherPack[]> {
  const admin = createAdminClient();
  const today = dayKeyKST();
  const { data: me } = await admin.from("profiles").select("role, school_id").eq("id", userId).maybeSingle();
  type Row = { id: string; title: string; track: Track; passages: { count: number }[] };

  if (me?.role === "teacher") {
    const { data } = await admin.from("packs").select("id, title, track, passages(count)").eq("school_id", me.school_id);
    return ((data ?? []) as Row[]).map((p) => ({ id: p.id, title: p.title, track: p.track, rounds: p.passages[0]?.count ?? 0, missionToday: false }));
  }

  const { data: enr } = await admin
    .from("enrollments")
    .select("class_id, classes!inner(school_years!inner(year))")
    .eq("student_id", userId)
    .eq("classes.school_years.year", schoolYearOf());
  const classIds = (enr ?? []).map((e) => e.class_id);
  if (!classIds.length) return [];
  const { data } = await admin
    .from("pack_assignments")
    .select("mission_day, packs!inner(id, title, track, passages(count))")
    .in("class_id", classIds);
  const byId = new Map<string, TeacherPack>();
  for (const a of data ?? []) {
    const p = a.packs as unknown as Row;
    const prev = byId.get(p.id);
    byId.set(p.id, {
      id: p.id,
      title: p.title,
      track: p.track,
      rounds: p.passages[0]?.count ?? 0,
      missionToday: (prev?.missionToday ?? false) || a.mission_day === today,
    });
  }
  return [...byId.values()];
}

/** 화면용: 한 요청 안에서는 한 번만 조회 */
export const loadPracticeData = cache(loadUncached);

/* ───────── 지문 발급 (서명된 표) ───────── */

/** m: 선생님 연습팩 지문의 모드 (sentences / code) */
type Ticket = { u: string; r: RoundRequest; h: string; s: number; m?: string };

const secret = () => {
  const s = process.env.PIN_PEPPER;
  if (!s) throw new Error(".env.local 에 PIN_PEPPER 가 없어요.");
  return `round:${s}`;
};
export const hashLines = (lines: readonly string[]) => createHash("sha256").update(lines.join("\n")).digest("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function makeToken(t: object) {
  const body = Buffer.from(JSON.stringify(t)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken<T = Ticket>(token: string): T | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

/** 한 판 시작: 서버가 지문을 만들고 서명된 표를 함께 줌 */
export async function issueRound(who: Who, req: RoundRequest): Promise<IssuedRound | { error: string }> {
  if (!TRACKS.includes(req.track)) return { error: "트랙을 찾을 수 없어요." };
  const data = await loadUncached(who.userId);
  let lines: string[];

  const packId = req.kind === "pack" ? req.packId : req.kind === "mission" ? req.packId : undefined;
  if (packId) {
    // 선생님 연습팩: 우리 반에 배포된 것만
    const pack = data.packs.find((p) => p.id === packId);
    if (!pack) return { error: "이 연습팩은 우리 반에 배포되지 않았어요." };
    const { data: rows } = await createAdminClient().from("passages").select("body, mode").eq("pack_id", packId);
    if (!rows?.length) return { error: "연습팩에 지문이 없어요." };
    const pick = rows[Math.floor(Math.random() * rows.length)];
    lines = pick.body.split("\n");
    const ticket: Ticket = { u: who.userId, r: { ...req, track: pack.track }, h: hashLines(lines), s: Date.now(), m: pick.mode };
    return { lines, token: makeToken(ticket) };
  }

  if (req.kind === "placement") {
    lines = buildPlacementRound(req.track);
  } else if (req.kind === "weak" || (req.kind === "mission" && req.weak)) {
    lines = buildWeakKeyRound(req.track, weakKeys(data.attempts, req.track, 3).map((w) => w.key));
  } else if (req.kind === "pack") {
    return { error: "연습팩을 찾을 수 없어요." };
  } else if (req.kind === "lesson") {
    // 파이썬 첫걸음: 앞 강의를 통과해야 다음 강의가 열림
    const l = lesson(req.lesson);
    if (!l) return { error: "강의를 찾을 수 없어요." };
    if (req.lesson > 1 && !data.progress.cleared.includes(`lesson-${req.lesson - 1}`)) {
      return { error: `${req.lesson - 1}강을 먼저 끝내 주세요.` };
    }
    const token = makeToken({ u: who.userId, r: { ...req, track: "code" }, h: hashLines(l.lines), s: Date.now() });
    return { lines: l.lines, token, note: l.note };
  } else {
    const level = getLevel(req.track, req.level);
    if (!level) return { error: "레벨을 찾을 수 없어요." };
    if (req.level > data.progress.unlocked[req.track]) return { error: "아직 열리지 않은 레벨이에요." };

    // 코드: 설명 카드·퀴즈를 붙이고, 빈칸 채우기면 가릴 곳도 알려 줌
    if (level.mode === "code") {
      const picked = pickCode(level);
      const note = codeNote(level.level, picked.index) ?? undefined;
      const mask = req.kind === "blank" && note ? (blankMask(picked.lines, note) ?? undefined) : undefined;
      if (req.kind === "blank" && !mask) return { error: "빈칸을 만들 수 없는 코드예요. 다시 시작해 주세요." };
      const token = makeToken({ u: who.userId, r: req, h: hashLines(picked.lines), s: Date.now() });
      return { lines: picked.lines, token, note, mask };
    }
    if (req.kind === "blank") return { error: "빈칸 채우기는 코드 트랙에서만 해요." };
    lines = buildRound(req.track, level);
  }

  return { lines, token: makeToken({ u: who.userId, r: req, h: hashLines(lines), s: Date.now() }) };
}

/* ───────── 저장 ───────── */

/** 개인 지갑에 코인 넣기 + 내역 */
export async function addCoins(userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  const admin = createAdminClient();
  const { data } = await admin.from("wallets").select("coins").eq("student_id", userId).maybeSingle();
  await admin.from("wallets").upsert({ student_id: userId, coins: (data?.coins ?? 0) + amount });
  await admin.from("coin_transactions").insert({ student_id: userId, amount, reason });
}

/** 반 지갑에 코인 넣기 (누가 보탰는지 함께 기록) */
async function addClassCoins(classId: string, userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  const admin = createAdminClient();
  const { data } = await admin.from("classes").select("coins").eq("id", classId).single();
  await admin.from("classes").update({ coins: (data?.coins ?? 0) + amount }).eq("id", classId);
  await admin.from("coin_transactions").insert({ class_id: classId, student_id: userId, amount, reason });
}

/** 오늘의 성장 점수를 다시 계산해서 저장 */
export async function refreshGrowth(who: Who) {
  const data = await loadUncached(who.userId);
  const today = dayKeyKST();
  const scored = data.attempts.filter((a) => a.kind !== "placement");
  const g = dailyGrowth({
    today: scored.filter((a) => dayKeyKST(a.at) === today),
    history: scored.filter((a) => dayKeyKST(a.at) < today),
    missionDone: data.progress.missionDays.includes(today),
    streakDays: streakDays(data.attempts),
    firstClearToday: data.progress.clearLog.some((c) => dayKeyKST(c.at) === today),
    placement: data.progress.placement ?? undefined,
  });
  await createAdminClient()
    .from("growth_scores")
    .upsert({
      student_id: who.userId,
      class_id: who.classId,
      day: today,
      participation: g.participation,
      speed: g.speed,
      accuracy: g.accuracy,
      streak: g.streak,
      first_clear: g.firstClear,
      total: g.total,
      updated_at: new Date().toISOString(),
    });
}

const SLACK_MS = 3000;

export async function saveRound(
  who: Who,
  sub: RoundSubmission,
): Promise<{ save: SaveResult; data: PracticeData } | { error: string }> {
  const ticket = readToken(sub.token);
  if (!ticket || ticket.u !== who.userId) return { error: "이 판의 표가 올바르지 않아요. 다시 시작해 주세요." };
  if (ticket.h !== hashLines(sub.lines)) return { error: "지문이 바뀌었어요. 다시 시작해 주세요." };

  const now = Date.now();
  const elapsed = now - ticket.s;
  if (elapsed > 30 * 60000) return { error: "시간이 너무 지났어요. 다시 시작해 주세요." };

  const admin = createAdminClient();
  // 같은 표로 두 번 저장 막기: 이 판을 시작한 뒤에 저장된 기록이 있으면 거절
  const { count } = await admin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", who.userId)
    .gt("created_at", new Date(ticket.s).toISOString());
  if ((count ?? 0) > 0) return { error: "이미 저장한 판이에요." };

  const req = ticket.r;
  const track = req.track;
  const flags = new Set<IntegrityFlag>();

  // 시간: 클라이언트가 말한 시간은 실제로 흐른 시간을 넘을 수 없음
  let durationMs = Math.max(1000, Math.round(sub.durationMs));
  if (durationMs > elapsed + SLACK_MS) durationMs = elapsed;
  if (req.kind === "placement") durationMs = Math.min(durationMs, PLACEMENT.secondsPerTrack * 1000 + SLACK_MS);

  // 타수: 서버가 직접 다시 계산 (맞게 친 글자의 자모 수)
  const typed = sub.lines.map((_, i) => String(sub.typedLines[i] ?? "").slice(0, sub.lines[i].length));
  const keystrokes = sub.lines.reduce((n, line, i) => n + correctKeystrokes(line, typed[i]), 0);
  const cpm = Math.round(keystrokes / (durationMs / 60000));

  // 정확도: 클라이언트 값을 쓰되, 최종 결과보다 높을 수는 없음
  const typedChars = typed.reduce((n, t) => n + t.length, 0);
  const correctChars = typed.reduce((n, t, i) => n + [...t].filter((ch, j) => ch === sub.lines[i][j]).length, 0);
  const finalRatio = typedChars ? (correctChars / typedChars) * 100 : 0;
  const committed = Math.max(1, sub.totalCommitted);
  const reported = Math.max(0, ((committed - sub.totalErrors) / committed) * 100);
  const accuracy = Math.round(Math.min(reported, finalRatio) * 10) / 10;

  for (const f of checkIntegrity(track, cpm, (sub.keyTimes ?? []).slice(0, 5000))) flags.add(f);
  // 키를 누른 횟수가 친 글자보다 훨씬 적으면 (입력 자동화 의심)
  if (keystrokes > 40 && (sub.keyTimes?.length ?? 0) < keystrokes * 0.3) flags.add("too-regular");
  if (cpm > INTEGRITY.maxCpm[track]) flags.add("too-fast");
  const suspicious = flags.size > 0;

  const isPack = req.kind === "pack" || (req.kind === "mission" && !!req.packId);
  const level = isPack
    ? PACK_LEVEL
    : req.kind === "blank"
      ? BLANK_LEVEL
      : req.kind === "lesson"
        ? LESSON_LEVEL
        : req.kind === "practice" || (req.kind === "mission" && !req.weak)
        ? req.level
        : 0;
  const mode = isPack
    ? (ticket.m ?? "sentences")
    : req.kind === "blank"
      ? "blank"
      : req.kind === "lesson"
        ? "lesson"
        : req.kind === "placement"
        ? "placement"
        : level === 0
          ? "weak"
          : (getLevel(track, level)?.mode ?? "keys");
  // 연습팩·빈칸 채우기도 기록 종류는 "연습"
  const kind = req.kind === "pack" || req.kind === "blank" || req.kind === "lesson" ? "practice" : req.kind;
  const missedKeys = Object.fromEntries(
    Object.entries(sub.missedKeys ?? {})
      .filter(([k, v]) => k.length <= 2 && Number.isInteger(v) && v > 0)
      .slice(0, 60),
  );

  const before = await loadUncached(who.userId);
  const ins = await admin
    .from("attempts")
    .insert({
      student_id: who.userId,
      class_id: who.classId,
      kind,
      track,
      level,
      mode,
      cpm,
      accuracy,
      keystrokes,
      duration_ms: durationMs,
      missed_keys: missedKeys,
      flags: [...flags],
      suspicious,
      review_status: suspicious ? "pending" : "none",
    })
    .select("*")
    .single();
  if (ins.error) return { error: "기록을 저장하지 못했어요. 다시 해 주세요." };
  const attempt = toAttempt(ins.data as AttemptRow);

  // 개인 기록 갱신
  const prevBest = Math.max(
    0,
    ...before.attempts
      .filter((a) => a.track === track && !a.suspicious && a.kind !== "placement" && a.kind !== "game")
      .map((a) => a.cpm),
  );
  const personalBest = !suspicious && req.kind !== "placement" && prevBest > 0 && cpm > prevBest;

  // 레벨 통과 → 다음 레벨 열기
  const lv = level > 0 ? getLevel(track, level) : undefined;
  const cleared = !!lv && !suspicious && accuracy >= LEVEL_CLEAR.minAccuracy && cpm >= lv.goalCpm;
  let firstClear = false;
  let unlockedLevel: number | null = null;
  if (cleared) {
    const clear = await admin.from("level_clears").insert({ student_id: who.userId, track, level });
    firstClear = !clear.error;
    const next = level + 1;
    if (firstClear && next <= maxLevel(track) && next > before.progress.unlocked[track]) {
      await admin.from("track_progress").upsert({ student_id: who.userId, track, unlocked_level: next });
      unlockedLevel = next;
    }
  }

  // 파이썬 첫걸음 강의 통과
  let lessonDone: number | null = null;
  if (req.kind === "lesson" && !suspicious && accuracy >= LESSON_PASS_ACCURACY) {
    const done = await admin.from("level_clears").insert({ student_id: who.userId, track: "lesson", level: req.lesson });
    if (!done.error) lessonDone = req.lesson;
  }

  // 코인
  let coins = 0;
  if (!suspicious && req.kind !== "placement") {
    await addCoins(who.userId, COINS.practiceRound, "연습 완료");
    coins += COINS.practiceRound;
    if (personalBest) {
      await addCoins(who.userId, COINS.personalBest, "개인 기록 갱신");
      coins += COINS.personalBest;
    }
  }

  if (req.kind !== "placement") await refreshGrowth(who);

  const save: SaveResult = {
    attempt,
    before: recentMedian(before.attempts, track, level),
    personalBest,
    cleared,
    firstClear,
    unlockedLevel,
    coins,
    lessonDone,
    tierUp: (() => {
      const was = trackTier(before.attempts, track);
      const now = trackTier([...before.attempts, attempt], track);
      return now !== was ? now : null;
    })(),
  };
  return { save, data: await loadUncached(who.userId) };
}

/** 오늘의 미션 완료: 오늘 미션 판을 다 쳤는지 서버에서 확인 */
export async function completeMission(who: Who) {
  const admin = createAdminClient();
  const today = dayKeyKST();
  const data = await loadUncached(who.userId);
  const todayRounds = data.attempts.filter((a) => a.kind === "mission" && dayKeyKST(a.at) === today && !a.suspicious);
  if (todayRounds.length < MISSION.rounds) return { error: "미션 판을 아직 다 치지 않았어요.", data };

  const ins = await admin.from("mission_completions").insert({ student_id: who.userId, day: today, class_id: who.classId });
  const firstToday = !ins.error;
  if (firstToday) {
    await addCoins(who.userId, COINS.missionPersonal, "오늘의 미션 완료");
    if (who.classId) await addClassCoins(who.classId, who.userId, COINS.missionClass, "오늘의 미션 완료");
    await refreshGrowth(who);
  }
  return {
    coins: firstToday ? COINS.missionPersonal : 0,
    classCoins: firstToday && who.classId ? COINS.missionClass : 0,
    firstToday,
    data: await loadUncached(who.userId),
  };
}

/** 배치 테스트 마무리: 오늘 친 배치 기록으로 시작 레벨 정하기 (학생마다 한 번) */
export async function finishPlacement(who: Who) {
  const admin = createAdminClient();
  const data = await loadUncached(who.userId);
  if (data.progress.placement) return { error: "배치 테스트는 이미 했어요.", data };

  const cpm = {} as Record<Track, number>;
  for (const t of TRACKS) {
    const last = data.attempts.filter((a) => a.kind === "placement" && a.track === t).at(-1);
    if (!last) return { error: "아직 치지 않은 트랙이 있어요.", data };
    cpm[t] = last.suspicious ? 0 : last.cpm;
  }

  const start = {} as Record<Track, number>;
  for (const t of TRACKS) {
    let level = 1;
    PLACEMENT.startLevelCpm[t].forEach((min, i) => {
      if (cpm[t] >= min) level = i + 1;
    });
    start[t] = Math.min(level, maxLevel(t));
  }

  await admin.from("track_progress").upsert(
    TRACKS.map((t) => ({
      student_id: who.userId,
      track: t,
      unlocked_level: Math.max(start[t], data.progress.unlocked[t]),
      placement_cpm: cpm[t],
    })),
  );
  return { cpm, start, data: await loadUncached(who.userId) };
}
