import "server-only";

// 반 대결 순위판 (서버 전용). CLAUDE.md 3-1:
//   반 점수 = 반 학생 성장 점수 합 ÷ 반 인원, 2주 단위(월요일 시작) 집계, 1위 반은 반 지갑 보너스
//
// 기간이 끝나면, 그다음 처음 순위판을 연 사람이 지난 기간 결과를 저장하고 1위 반에 보너스를 줘요.

import { CLASS_BATTLE, GROWTH } from "@/config/game";
import { dayKeyKST } from "@/lib/practice/day";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 86400000;
const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 오늘이 속한 2주 기간 { start, end } (YYYY-MM-DD) */
export function periodOf(day: string) {
  const len = GROWTH.classBattlePeriodDays;
  const idx = Math.floor((toMs(day) - toMs(CLASS_BATTLE.firstMonday)) / DAY / len);
  const start = toMs(CLASS_BATTLE.firstMonday) + idx * len * DAY;
  return { start: toDay(start), end: toDay(start + (len - 1) * DAY) };
}

export type BattleRow = {
  classId: string;
  classNo: number;
  score: number;
  members: number;
  /** 이번 기간에 성장 점수를 한 번이라도 받은 친구 수 */
  joined: number;
  rank: number;
  mine: boolean;
};

export type BattleData = {
  grade: number;
  period: { start: string; end: string; daysLeft: number };
  rows: BattleRow[];
  /** 지난 기간 결과 (없으면 null) */
  last: { start: string; end: string; winners: number[]; bonus: number } | null;
  /** 내가 이번 기간에 보탠 성장 점수 (학생만) */
  myPoints: number | null;
  ready: boolean;
};

/** 같은 점수면 같은 등수 */
function ranked<T extends { score: number }>(rows: T[]): (T & { rank: number })[] {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  return sorted.map((r) => ({ ...r, rank: sorted.findIndex((x) => x.score === r.score) + 1 }));
}

type ClassRow = { id: string; class_no: number };

async function classesOf(schoolYearId: string, grade: number): Promise<ClassRow[]> {
  const { data } = await createAdminClient()
    .from("classes")
    .select("id, class_no")
    .eq("school_year_id", schoolYearId)
    .eq("grade", grade)
    .order("class_no");
  return data ?? [];
}

/** 반별 학생 수와, 기간 안의 성장 점수 */
async function scoresFor(classes: ClassRow[], start: string, end: string) {
  const admin = createAdminClient();
  const ids = classes.map((c) => c.id);
  const [enr, growth] = await Promise.all([
    admin.from("enrollments").select("class_id, student_id, profiles!inner(role)").in("class_id", ids),
    admin.from("growth_scores").select("class_id, student_id, total").in("class_id", ids).gte("day", start).lte("day", end),
  ]);
  type Enr = { class_id: string; student_id: string; profiles: { role: string } };
  const students = ((enr.data ?? []) as unknown as Enr[]).filter((e) => e.profiles.role === "student");
  return classes.map((c) => {
    const members = students.filter((s) => s.class_id === c.id).length;
    const rows = (growth.data ?? []).filter((g) => g.class_id === c.id);
    const sum = rows.reduce((n, g) => n + g.total, 0);
    return {
      classId: c.id,
      classNo: c.class_no,
      members,
      joined: new Set(rows.map((g) => g.student_id)).size,
      score: members ? Math.round((sum / members) * 10) / 10 : 0,
      growth: rows,
    };
  });
}

/** 지난 기간 결과를 아직 저장 안 했으면 저장하고 1위 반에 보너스 */
async function settle(classes: ClassRow[], start: string, end: string) {
  const admin = createAdminClient();
  const existing = await admin
    .from("class_battle_results")
    .select("class_id")
    .eq("period_start", start)
    .in("class_id", classes.map((c) => c.id));
  if (existing.error) return false;
  if ((existing.data ?? []).length) return true;

  const scores = ranked(await scoresFor(classes, start, end));
  // 아무도 점수가 없으면 1위도 없어요
  const hasWinner = scores.some((s) => s.score > 0);
  const { data: inserted } = await admin
    .from("class_battle_results")
    .upsert(
      scores.map((s) => ({
        period_start: start,
        class_id: s.classId,
        rank: s.rank,
        score: s.score,
        members: s.members,
        bonus: hasWinner && s.rank === 1 ? CLASS_BATTLE.winnerBonus : 0,
      })),
      { onConflict: "period_start,class_id", ignoreDuplicates: true },
    )
    .select("class_id, bonus");
  // 실제로 새로 넣은 줄에만 보너스 (동시에 두 명이 열어도 한 번만)
  for (const r of inserted ?? []) {
    if (r.bonus <= 0) continue;
    const { error } = await admin.rpc("add_class_coins", { p_class: r.class_id, p_amount: r.bonus });
    if (error) {
      const { data } = await admin.from("classes").select("coins").eq("id", r.class_id).single();
      await admin.from("classes").update({ coins: (data?.coins ?? 0) + r.bonus }).eq("id", r.class_id);
    }
    await admin.from("coin_transactions").insert({ class_id: r.class_id, amount: r.bonus, reason: "반 대결 1위 보너스" });
  }
  return true;
}

/** 한 학년의 반 대결 순위판. myClassId·myId 가 있으면 우리 반·내 점수 표시 */
export async function loadBattle(opts: {
  schoolYearId: string;
  grade: number;
  myClassId?: string | null;
  myId?: string | null;
}): Promise<BattleData> {
  const today = dayKeyKST();
  const period = periodOf(today);
  const classes = await classesOf(opts.schoolYearId, opts.grade);

  const prev = periodOf(toDay(toMs(period.start) - DAY));
  let ready = true;
  let last: BattleData["last"] = null;
  if (prev.start >= CLASS_BATTLE.firstMonday && classes.length) {
    ready = await settle(classes, prev.start, prev.end);
    if (ready) {
      const { data } = await createAdminClient()
        .from("class_battle_results")
        .select("class_id, rank, bonus")
        .eq("period_start", prev.start)
        .in("class_id", classes.map((c) => c.id));
      const winners = (data ?? []).filter((r) => r.rank === 1 && r.bonus > 0);
      last = {
        ...prev,
        winners: winners.map((w) => classes.find((c) => c.id === w.class_id)?.class_no ?? 0).sort((a, b) => a - b),
        bonus: CLASS_BATTLE.winnerBonus,
      };
    }
  }

  const scores = classes.length ? await scoresFor(classes, period.start, today) : [];
  const myPoints = opts.myId
    ? scores.flatMap((s) => s.growth).filter((g) => g.student_id === opts.myId).reduce((n, g) => n + g.total, 0)
    : null;

  return {
    grade: opts.grade,
    period: { ...period, daysLeft: Math.round((toMs(period.end) - toMs(today)) / DAY) + 1 },
    rows: ranked(scores).map((r) => ({
      classId: r.classId,
      classNo: r.classNo,
      score: r.score,
      members: r.members,
      joined: r.joined,
      rank: r.rank,
      mine: r.classId === opts.myClassId,
    })),
    last,
    myPoints,
    ready,
  };
}

/** 학생: 내 반이 속한 학년의 순위판 */
export async function loadMyBattle(userId: string, classId: string | null) {
  if (!classId) return null;
  const { data } = await createAdminClient().from("classes").select("school_year_id, grade").eq("id", classId).single();
  if (!data) return null;
  return loadBattle({ schoolYearId: data.school_year_id, grade: data.grade, myClassId: classId, myId: userId });
}
