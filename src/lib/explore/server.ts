import "server-only";

// 교과 탐험 (서버 전용): 과목(subject)이 붙은 연습팩 = 단원. 지문(passages) 하나 = 한 판.
// 같은 학교 학생에게 보여요 (학년을 정한 단원은 그 학년만). 지문마다 가장 좋은 별을 저장해요.

import { SUBJECTS, subjectOf } from "@/config/subjects";
import type { Track } from "@/config/game";
import { loadEnrollment } from "@/lib/auth/viewer";
import { addCoins } from "@/lib/practice/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { blankCount, quizSentences, stripBlanks, type QuizSentence } from "./quiz";

export type ExplorePassage = { id: string; stars: number };
/** quiz: 개념 퀴즈 빈칸 수 (0이면 퀴즈 없음) */
export type ExploreUnit = { packId: string; unitNo: number; title: string; grade: number | null; passages: ExplorePassage[]; quiz: number };
export type ExploreSubject = { id: string; label: string; icon: string; track: Track; units: ExploreUnit[] };
export type ExploreData = { ready: boolean; subjects: ExploreSubject[] };

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

export async function loadExplore(userId: string): Promise<ExploreData> {
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
  return { ready, subjects };
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

/** 퀴즈를 끝까지 했을 때: 이 단원 퀴즈를 처음 끝냈으면 코인 */
export async function finishConceptQuiz(userId: string, packId: string): Promise<{ coins: number } | { error: string }> {
  const quiz = await loadConceptQuiz(userId, packId);
  if (!quiz) return { error: "퀴즈를 찾을 수 없어요." };
  if (quiz.done) return { coins: 0 };
  await addCoins(userId, CONCEPT_QUIZ_COINS, quizReason(quiz.title));
  return { coins: CONCEPT_QUIZ_COINS };
}
