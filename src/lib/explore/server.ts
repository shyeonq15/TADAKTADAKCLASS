import "server-only";

// 교과 탐험 (서버 전용): 과목(subject)이 붙은 연습팩 = 단원. 지문(passages) 하나 = 한 판.
// 같은 학교 학생에게 보여요 (학년을 정한 단원은 그 학년만). 지문마다 가장 좋은 별을 저장해요.

import { EXPLORE_RANK, SUBJECTS, subjectOf } from "@/config/subjects";
import type { Track } from "@/config/game";
import { ensureSchoolYear, loadEnrollment } from "@/lib/auth/viewer";
import { isTestNumber } from "@/lib/auth/testAccount";
import { classesOf } from "@/lib/battle/server";
import { addCoins } from "@/lib/practice/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { blankCount, quizSentences, scoreFirstAnswers, stripBlanks, type QuizSentence } from "./quiz";

export type ExplorePassage = { id: string; stars: number };
/** quiz: 개념 퀴즈 빈칸 수 (0이면 퀴즈 없음) */
export type ExploreUnit = { packId: string; unitNo: number; title: string; grade: number | null; passages: ExplorePassage[]; quiz: number };
export type ExploreSubject = { id: string; label: string; icon: string; track: Track; units: ExploreUnit[] };
/** 랭킹 한 줄 (닉네임만. 같은 학년 안에서) */
export type RankEntry = { nickname: string; classNo: number; value: string; me: boolean };
/** 과목별 별 랭킹, 단원별 빠르게 친 친구·퀴즈왕 */
export type ExploreRanks = { subjects: Record<string, RankEntry[]>; units: Record<string, { speed: RankEntry[]; quiz: RankEntry[] }> };
export type ExploreData = { ready: boolean; subjects: ExploreSubject[]; ranks?: ExploreRanks };

const missing = (e: { code?: string } | null) => !!e && ["42P01", "PGRST205", "42703", "PGRST204"].includes(e.code ?? "");

/** 이 사람이 볼 수 있는 단원들: 같은 학교, 학년이 없거나 내 학년 (선생님은 모두) */
async function visiblePacks(userId: string) {
  const admin = createAdminClient();
  const [{ data: me }, enrollment] = await Promise.all([
    admin.from("profiles").select("role, school_id").eq("id", userId).maybeSingle(),
    loadEnrollment(userId),
  ]);
  if (!me) return { ready: true, packs: [] as PackRow[] };
  const res = await admin
    .from("packs")
    .select("id, title, track, subject, unit_no, grade, passages(id, sort, body)")
    .eq("school_id", me.school_id)
    .not("subject", "is", null);
  if (res.error) return { ready: !missing(res.error), packs: [] as PackRow[] };
  const grade = enrollment?.grade ?? null;
  const packs = ((res.data ?? []) as unknown as PackRow[]).filter((p) => me.role === "teacher" || p.grade === null || p.grade === grade);
  return { ready: true, packs };
}

type PackRow = {
  id: string;
  title: string;
  track: Track;
  subject: string;
  unit_no: number | null;
  grade: number | null;
  passages: { id: string; sort: number; body: string }[];
};

const bodiesOf = (p: PackRow) => [...p.passages].sort((a, b) => a.sort - b.sort).map((x) => x.body);

export async function loadExplore(userId: string, opts?: { ranks?: boolean }): Promise<ExploreData> {
  const { ready, packs } = await visiblePacks(userId);
  const passageIds = packs.flatMap((p) => p.passages.map((x) => x.id));
  const { data: prog } = passageIds.length
    ? await createAdminClient().from("subject_progress").select("passage_id, stars").eq("student_id", userId).in("passage_id", passageIds)
    : { data: [] as { passage_id: string; stars: number }[] };
  const stars = new Map((prog ?? []).map((r) => [r.passage_id, r.stars]));

  const subjects = SUBJECTS.map((s) => ({
    ...s,
    units: packs
      .filter((p) => p.subject === s.id)
      .sort((a, b) => (a.unit_no ?? 999) - (b.unit_no ?? 999) || a.title.localeCompare(b.title))
      .map((p) => ({
        packId: p.id,
        unitNo: p.unit_no ?? 0,
        title: p.title,
        grade: p.grade,
        passages: [...p.passages].sort((a, b) => a.sort - b.sort).map((x) => ({ id: x.id, stars: stars.get(x.id) ?? 0 })),
        quiz: blankCount(bodiesOf(p)),
      })),
  }));
  return { ready, subjects, ...(opts?.ranks ? { ranks: await exploreRanks(userId, packs) } : {}) };
}

/** 한 판 시작: 이 학생이 볼 수 있는 단원의 지문인지 확인하고 지문을 돌려줘요 */
export async function explorePassage(userId: string, passageId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("passages").select("id, body, pack_id").eq("id", passageId).maybeSingle();
  if (!data) return null;
  const { packs } = await visiblePacks(userId);
  const pack = packs.find((p) => p.id === data.pack_id);
  if (!pack) return null;
  const subject = subjectOf(pack.subject);
  // [대괄호]는 개념 퀴즈 빈칸 표시라서 타자 칠 때는 빼요
  return { lines: data.body.split("\n").map(stripBlanks), track: subject?.track ?? pack.track, title: pack.title, subject: subject?.label ?? "" };
}

/** 지문 별 저장 (더 좋을 때만). 저장한 별 수를 돌려줘요 */
export async function saveExploreStars(userId: string, passageId: string, stars: number, cpm: number, accuracy: number) {
  const admin = createAdminClient();
  const { data: cur } = await admin.from("subject_progress").select("stars, best_cpm").eq("student_id", userId).eq("passage_id", passageId).maybeSingle();
  if (cur && cur.stars >= stars && cur.best_cpm >= cpm) return cur.stars;
  await admin.from("subject_progress").upsert({
    student_id: userId,
    passage_id: passageId,
    stars: Math.max(stars, cur?.stars ?? 0),
    best_cpm: Math.max(cpm, cur?.best_cpm ?? 0),
    best_accuracy: accuracy,
    updated_at: new Date().toISOString(),
  });
  return Math.max(stars, cur?.stars ?? 0);
}

/** 칭호용: 모은 별 합, 모든 지문을 ★1 이상 깬 단원 수 */
export async function exploreTotals(userId: string) {
  const data = await loadExplore(userId);
  const units = data.subjects.flatMap((s) => s.units);
  return {
    stars: units.reduce((n, u) => n + u.passages.reduce((m, p) => m + p.stars, 0), 0),
    unitsCleared: units.filter((u) => u.passages.length > 0 && u.passages.every((p) => p.stars >= 1)).length,
  };
}

/* ───────── 개념 빈칸 퀴즈 ───────── */

/** 처음 끝냈을 때 코인 */
export const CONCEPT_QUIZ_COINS = 5;
const quizReason = (title: string) => `개념 퀴즈: ${title}`;

export type ConceptQuiz = { packId: string; title: string; subject: string; icon: string; sentences: QuizSentence[]; done: boolean };

/** 이 학생이 볼 수 있는 단원의 퀴즈 (스스로 확인하는 연습이라 정답이 화면에 함께 가요) */
export async function loadConceptQuiz(userId: string, packId: string): Promise<ConceptQuiz | null> {
  const { packs } = await visiblePacks(userId);
  const pack = packs.find((p) => p.id === packId);
  if (!pack) return null;
  const sentences = quizSentences(bodiesOf(pack));
  if (!sentences.length) return null;
  const subject = subjectOf(pack.subject);
  const { count } = await createAdminClient()
    .from("coin_transactions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", userId)
    .eq("reason", quizReason(pack.title));
  return { packId, title: pack.title, subject: subject?.label ?? "", icon: subject?.icon ?? "", sentences, done: (count ?? 0) > 0 };
}

/**
 * 퀴즈를 끝까지 했을 때: 서버가 처음 친 답들로 다시 채점해서 가장 좋은 기록을 남기고(퀴즈 랭킹),
 * 이 단원 퀴즈를 처음 끝냈으면 코인
 */
export async function finishConceptQuiz(
  userId: string,
  packId: string,
  sub: { firstAnswers: unknown[]; durationMs: number },
): Promise<{ coins: number; score: number; total: number; best: boolean } | { error: string }> {
  const quiz = await loadConceptQuiz(userId, packId);
  if (!quiz) return { error: "퀴즈를 찾을 수 없어요." };
  const { score, total } = scoreFirstAnswers(quiz.sentences, Array.isArray(sub?.firstAnswers) ? sub.firstAnswers.slice(0, 500) : []);
  // 사람이 칠 수 없을 만큼 빠른 기록은 랭킹에 넣지 않아요 (빈칸 하나에 최소 1초)
  const ms = Math.round(Number(sub?.durationMs) || 0);
  let best = false;
  if (ms >= total * 1000) {
    const admin = createAdminClient();
    const { data: cur, error } = await admin
      .from("concept_quiz_scores")
      .select("best_score, best_ms, plays")
      .eq("student_id", userId)
      .eq("pack_id", packId)
      .maybeSingle();
    if (!error) {
      best = !cur || score > cur.best_score || (score === cur.best_score && ms < cur.best_ms);
      await admin.from("concept_quiz_scores").upsert({
        student_id: userId,
        pack_id: packId,
        best_score: best ? score : cur!.best_score,
        best_ms: best ? ms : cur!.best_ms,
        total,
        plays: (cur?.plays ?? 0) + 1,
        updated_at: new Date().toISOString(),
      });
    }
  }
  let coins = 0;
  if (!quiz.done) {
    await addCoins(userId, CONCEPT_QUIZ_COINS, quizReason(quiz.title));
    coins = CONCEPT_QUIZ_COINS;
  }
  return { coins, score, total, best };
}

/* ───────── 랭킹 (CLAUDE.md 6장 예외: 교사 결정 2026-11-04) ───────── */

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/** 행이 많을 수 있어서 1000개씩 나눠 읽어요 */
async function allRows<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const out: T[] = [];
  for (let page = 0; page < 50; page++) {
    const { data, error } = await read(page * 1000, page * 1000 + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/** 같은 학년 학생(선생님 테스트 계정 빼고) 안에서: 과목별 별 합, 단원별 평균 타수·퀴즈 점수 */
async function exploreRanks(userId: string, packs: PackRow[]): Promise<ExploreRanks> {
  const empty: ExploreRanks = { subjects: {}, units: {} };
  if (!packs.length) return empty;
  const admin = createAdminClient();
  const enrollment = await loadEnrollment(userId);
  const schoolYearId = enrollment?.schoolYearId ?? (await ensureSchoolYear()).schoolYearId;
  const classes = await classesOf(schoolYearId, enrollment?.grade ?? 1);
  if (!classes.length) return empty;
  const { data: enr } = await admin
    .from("enrollments")
    .select("student_id, class_id, number, profiles!inner(nickname, role)")
    .in(
      "class_id",
      classes.map((c) => c.id),
    );
  type Enr = { student_id: string; class_id: string; number: number; profiles: { nickname: string | null; role: string } };
  const people = new Map<string, { nickname: string; classNo: number }>();
  for (const e of (enr ?? []) as unknown as Enr[]) {
    if (e.profiles.role !== "student" || isTestNumber(e.number)) continue;
    people.set(e.student_id, { nickname: e.profiles.nickname ?? "친구", classNo: classes.find((c) => c.id === e.class_id)?.class_no ?? 0 });
  }
  if (!people.size) return empty;

  const passageIds = packs.flatMap((p) => p.passages.map((x) => x.id));
  const packOf = new Map(packs.flatMap((p) => p.passages.map((x) => [x.id, p] as const)));
  type Prog = { student_id: string; passage_id: string; stars: number; best_cpm: number };
  const prog = (
    await allRows<Prog>((a, b) =>
      admin
        .from("subject_progress")
        .select("student_id, passage_id, stars, best_cpm")
        .in("passage_id", passageIds)
        .order("student_id")
        .order("passage_id")
        .range(a, b),
    )
  ).filter((r) => people.has(r.student_id) && r.stars > 0);
  type QuizRow = { student_id: string; pack_id: string; best_score: number; total: number; best_ms: number };
  const quiz = (
    await allRows<QuizRow>((a, b) =>
      admin
        .from("concept_quiz_scores")
        .select("student_id, pack_id, best_score, total, best_ms")
        .in(
          "pack_id",
          packs.map((p) => p.id),
        )
        .order("student_id")
        .order("pack_id")
        .range(a, b),
    )
  ).filter((r) => people.has(r.student_id) && r.best_score > 0);

  const entry = (id: string, value: string): RankEntry => ({ ...people.get(id)!, value, me: id === userId });

  // 과목별 별 합
  const subjects: ExploreRanks["subjects"] = {};
  for (const sub of SUBJECTS) {
    const sum = new Map<string, number>();
    for (const r of prog) if (packOf.get(r.passage_id)?.subject === sub.id) sum.set(r.student_id, (sum.get(r.student_id) ?? 0) + r.stars);
    subjects[sub.id] = [...sum]
      .sort((a, b) => b[1] - a[1])
      .slice(0, EXPLORE_RANK.subject)
      .map(([id, n]) => entry(id, `★ ${n}`));
  }

  // 단원별: 별을 받은 지문의 평균 타수, 퀴즈 점수(같으면 빨리 끝낸 친구가 위)
  const units: ExploreRanks["units"] = {};
  for (const p of packs) {
    const ids = new Set(p.passages.map((x) => x.id));
    const per = new Map<string, number[]>();
    for (const r of prog) if (ids.has(r.passage_id)) per.set(r.student_id, [...(per.get(r.student_id) ?? []), r.best_cpm]);
    const speed = [...per]
      .map(([id, cpms]) => ({ id, avg: Math.round(cpms.reduce((a, b) => a + b, 0) / cpms.length), n: cpms.length }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, EXPLORE_RANK.unit)
      .map((x) => entry(x.id, `${x.avg}타 · 지문 ${x.n}개`));
    const q = quiz
      .filter((r) => r.pack_id === p.id)
      .sort((a, b) => b.best_score - a.best_score || a.best_ms - b.best_ms)
      .slice(0, EXPLORE_RANK.unit)
      .map((r) => entry(r.student_id, `${r.best_score}/${r.total}칸 · ${mmss(r.best_ms)}`));
    units[p.id] = { speed, quiz: q };
  }
  return { subjects, units };
}
