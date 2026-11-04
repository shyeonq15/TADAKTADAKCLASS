import "server-only";

// 교과 탐험 (서버 전용): 과목(subject)이 붙은 연습팩 = 단원. 지문(passages) 하나 = 한 판.
// 같은 학교 학생에게 보여요 (학년을 정한 단원은 그 학년만). 지문마다 가장 좋은 별을 저장해요.

import { EXPLORE_RANK, quizStars, SUBJECT_POINTS, SUBJECTS, subjectOf } from "@/config/subjects";
import { caseSetOf } from "@/config/cases";
import { VOCAB_CLEAR } from "@/config/vocab";
import type { Track } from "@/config/game";
import { loadEnrollment } from "@/lib/auth/viewer";
import { allRows, gradePeople, type RankEntry } from "@/lib/rank/people";
import { addCoins } from "@/lib/practice/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { blankCount, quizSentences, scoreFirstAnswers, stripBlanks, type QuizSentence } from "./quiz";

export type ExplorePassage = { id: string; stars: number };
/** quiz: 개념 퀴즈 빈칸 수 (0이면 퀴즈 없음) */
export type ExploreUnit = { packId: string; unitNo: number; title: string; grade: number | null; passages: ExplorePassage[]; quiz: number };
export type ExploreSubject = { id: string; label: string; icon: string; track: Track; units: ExploreUnit[] };
export type { RankEntry };
/** 내 과목 점수와 재료 */
export type MyPoints = { score: number; stars: number; improves: number; days: number };
/** 과목마다 과목 점수 순위 + 내 점수 */
export type ExploreRanks = { subjects: Record<string, RankEntry[]>; mine: Record<string, MyPoints> };
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
  const q = (cols: string) => admin.from("subject_progress").select(cols).eq("student_id", userId).eq("passage_id", passageId).maybeSingle();
  // improves 칸이 아직 없으면 (SQL 실행 전) 그 칸 없이
  let res = await q("stars, best_cpm, improves");
  const hasImproves = !res.error;
  if (!hasImproves) res = await q("stars, best_cpm");
  const cur = res.data as unknown as { stars: number; best_cpm: number; improves?: number } | null;
  if (cur && cur.stars >= stars && cur.best_cpm >= cpm) return cur.stars;
  // 같은 지문을 다시 쳐서 내 최고 타수를 넘으면 기록 갱신 (과목 점수의 성장)
  const improved = !!cur && cpm > cur.best_cpm;
  await admin.from("subject_progress").upsert({
    student_id: userId,
    passage_id: passageId,
    stars: Math.max(stars, cur?.stars ?? 0),
    best_cpm: Math.max(cpm, cur?.best_cpm ?? 0),
    best_accuracy: accuracy,
    updated_at: new Date().toISOString(),
    ...(hasImproves ? { improves: (cur?.improves ?? 0) + (improved ? 1 : 0) } : {}),
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

export type ConceptQuiz = { packId: string; title: string; subject: string; subjectId: string; icon: string; sentences: QuizSentence[]; done: boolean };

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
  return { packId, title: pack.title, subject: subject?.label ?? "", subjectId: pack.subject, icon: subject?.icon ?? "", sentences, done: (count ?? 0) > 0 };
}

/**
 * 퀴즈를 끝까지 했을 때: 서버가 처음 친 답들로 다시 채점해서 가장 좋은 기록을 남기고(퀴즈 랭킹),
 * 이 단원 퀴즈를 처음 끝냈으면 코인
 */
export async function finishConceptQuiz(
  userId: string,
  packId: string,
  sub: { firstAnswers: unknown[]; durationMs: number },
): Promise<{ coins: number; score: number; total: number; best: boolean; subjectId: string } | { error: string }> {
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
  return { coins, score, total, best, subjectId: quiz.subjectId };
}

/* ───────── 과목 점수·과목 랭킹 (CLAUDE.md 6장 예외: 교사 결정 2026-11-04) ─────────
 * 과목 점수 = 별 × star + 기록 갱신 × improve + 연습한 날 × day  (config/subjects.ts SUBJECT_POINTS)
 *  · 별: 지문 별, 개념 퀴즈·사례 퀴즈 별(처음에 맞힌 비율), 영어는 영단어 묶음 단계(단어장·빈칸·듣기)
 *  · 기록 갱신: 같은 지문에서 내 최고 타수를 넘은 횟수
 *  · 연습한 날: 그 과목을 연습한 날 수 (activity_log 의 "subject:과목")
 */

type Points = { stars: number; improves: number; days: number };
const pointsOf = (p: Points) => p.stars * SUBJECT_POINTS.star + p.improves * SUBJECT_POINTS.improve + p.days * SUBJECT_POINTS.day;
const detailOf = (p: Points) => `★${p.stars} · 갱신 ${p.improves} · ${p.days}일`;

/** 같은 학년 학생(선생님 테스트 계정 빼고) 안에서 과목마다 과목 점수 순위 + 내 점수 */
async function exploreRanks(userId: string, packs: PackRow[]): Promise<ExploreRanks> {
  const empty: ExploreRanks = { subjects: {}, mine: {} };
  const admin = createAdminClient();
  const people = await gradePeople(userId);
  if (!people.size) return empty;
  const ids = [...people.keys()];

  const passageIds = packs.flatMap((p) => p.passages.map((x) => x.id));
  const subjectOfPassage = new Map(packs.flatMap((p) => p.passages.map((x) => [x.id, p.subject] as const)));
  const subjectOfPack = new Map(packs.map((p) => [p.id, p.subject] as const));

  type Prog = { student_id: string; passage_id: string; stars: number; improves?: number };
  const readProg = (cols: string) =>
    allRows<Prog>((a, b) =>
      admin.from("subject_progress").select(cols).in("passage_id", passageIds).order("student_id").order("passage_id").range(a, b) as unknown as PromiseLike<{
        data: Prog[] | null;
        error: unknown;
      }>,
    );
  // improves 칸이 아직 없으면 (SQL 실행 전) 별만
  let prog = passageIds.length ? await readProg("student_id, passage_id, stars, improves") : [];
  if (passageIds.length && !prog.length) prog = await readProg("student_id, passage_id, stars");

  const [quiz, cases, vocab, days] = await Promise.all([
    packs.length
      ? allRows<{ student_id: string; pack_id: string; best_score: number; total: number }>((a, b) =>
          admin
            .from("concept_quiz_scores")
            .select("student_id, pack_id, best_score, total")
            .in(
              "pack_id",
              packs.map((p) => p.id),
            )
            .order("student_id")
            .order("pack_id")
            .range(a, b),
        )
      : [],
    allRows<{ student_id: string; set_id: string; best_score: number; total: number }>((a, b) =>
      admin.from("case_quiz_scores").select("student_id, set_id, best_score, total").in("student_id", ids).order("student_id").order("set_id").range(a, b),
    ),
    allRows<{ student_id: string }>((a, b) =>
      admin
        .from("level_clears")
        .select("student_id")
        .in("student_id", ids)
        .in("track", [VOCAB_CLEAR.study, VOCAB_CLEAR.blank, VOCAB_CLEAR.listen])
        .order("student_id")
        .order("track")
        .order("level")
        .range(a, b),
    ),
    allRows<{ student_id: string; kind: string }>((a, b) =>
      admin.from("activity_log").select("student_id, kind").in("student_id", ids).like("kind", "subject:%").order("student_id").order("day").order("kind").range(a, b),
    ),
  ]);

  // 과목 → 학생 → 점수 재료
  const table = new Map<string, Map<string, Points>>();
  const add = (subject: string | undefined, student: string, part: Partial<Points>) => {
    if (!subject || !people.has(student)) return;
    const bySubject = table.get(subject) ?? new Map<string, Points>();
    const p = bySubject.get(student) ?? { stars: 0, improves: 0, days: 0 };
    p.stars += part.stars ?? 0;
    p.improves += part.improves ?? 0;
    p.days += part.days ?? 0;
    bySubject.set(student, p);
    table.set(subject, bySubject);
  };
  for (const r of prog) add(subjectOfPassage.get(r.passage_id), r.student_id, { stars: r.stars, improves: r.improves ?? 0 });
  for (const r of quiz) add(subjectOfPack.get(r.pack_id), r.student_id, { stars: quizStars(r.best_score, r.total) });
  for (const r of cases) add(caseSetOf(r.set_id)?.subject, r.student_id, { stars: quizStars(r.best_score, r.total) });
  for (const r of vocab) add("english", r.student_id, { stars: 1 });
  for (const r of days) add(r.kind.slice("subject:".length), r.student_id, { days: 1 });

  const subjects: ExploreRanks["subjects"] = {};
  const mine: ExploreRanks["mine"] = {};
  for (const s of SUBJECTS) {
    const bySubject = table.get(s.id) ?? new Map<string, Points>();
    subjects[s.id] = [...bySubject]
      .map(([id, p]) => ({ id, p, score: pointsOf(p) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || b.p.stars - a.p.stars)
      .slice(0, EXPLORE_RANK.subject)
      .map((x) => ({ ...people.get(x.id)!, value: `${x.score}점`, detail: detailOf(x.p), me: x.id === userId }));
    const p = bySubject.get(userId);
    if (p) mine[s.id] = { score: pointsOf(p), ...p };
  }
  return { subjects, mine };
}

/** 한 과목 랭킹만 (영단어 연구소 → 영어) */
export async function loadSubjectRank(userId: string, subjectId: string) {
  const { packs } = await visiblePacks(userId);
  const r = await exploreRanks(userId, packs);
  return { entries: r.subjects[subjectId] ?? [], mine: r.mine[subjectId] ?? null };
}

/** 지문이 어느 과목인지 (연습한 날 기록용) */
export async function passageSubject(passageId: string) {
  const { data } = await createAdminClient().from("passages").select("packs!inner(subject)").eq("id", passageId).maybeSingle();
  return ((data?.packs as unknown as { subject: string | null } | undefined)?.subject ?? null) as string | null;
}

/* ───────── 이어 읽기: 앞뒤 지문 ───────── */

/** 이 지문의 바로 앞 지문 끝 몇 줄과 다음 지문 첫 몇 줄 (글이 끊기지 않고 이어져 보이게) */
export async function passageContext(userId: string, passageId: string, lines = 3) {
  const { packs } = await visiblePacks(userId);
  for (const p of packs) {
    const sorted = [...p.passages].sort((a, b) => a.sort - b.sort);
    const i = sorted.findIndex((x) => x.id === passageId);
    if (i < 0) continue;
    const linesOf = (k: number) => (sorted[k]?.body ?? "").split("\n").filter(Boolean).map(stripBlanks);
    return { before: i > 0 ? linesOf(i - 1).slice(-lines) : [], after: linesOf(i + 1).slice(0, lines) };
  }
  return { before: [], after: [] };
}
