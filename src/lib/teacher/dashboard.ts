import "server-only";

// 교사 대시보드 (서버 전용): 반마다 학생별 티어·단계, 이번 주 참여(연습·미션·게임·교과 탐험), 진도, 마지막 활동.
// 학생 화면과 달리 실명이 보이고, 선생님 학교의 반만 읽어요 (부르는 쪽에서 확인).

import { SUBJECT_LEVEL, TIERS, TRACKS, type Tier, type Track } from "@/config/game";
import { isTestNumber } from "@/lib/auth/testAccount";
import { dayKeyKST } from "@/lib/practice/day";
import { tierOfStage } from "@/lib/practice/stages";
import { weekOf } from "@/lib/season";
import { createAdminClient } from "@/lib/supabase/admin";

export type WeekCounts = {
  practice: number;
  mission: number;
  rain: number;
  runner: number;
  boss: number;
  race: number;
  explore: number;
  keystrokes: number;
};

export type DashStudent = {
  id: string;
  number: number;
  realName: string | null;
  nickname: string | null;
  test: boolean;
  stages: Record<Track, number>;
  week: WeekCounts;
  lessons: number;
  binary: number;
  /** 마지막으로 기록을 남긴 날 (최근 30일 안, 없으면 null) */
  lastDay: string | null;
  missionToday: boolean;
};

export type ClassDash = {
  classId: string;
  grade: number;
  classNo: number;
  students: DashStudent[];
  summary: {
    members: number;
    activeWeek: number;
    missionToday: number;
    week: WeekCounts;
    avgStage: Record<Track, number>;
    tierCounts: Record<Track, Record<Tier, number>>;
  };
};

const EMPTY_WEEK = (): WeekCounts => ({ practice: 0, mission: 0, rain: 0, runner: 0, boss: 0, race: 0, explore: 0, keystrokes: 0 });

export async function loadClassDashboard(cls: { id: string; grade: number; class_no: number }): Promise<ClassDash> {
  const admin = createAdminClient();
  const { data: enr } = await admin
    .from("enrollments")
    .select("student_id, number, profiles!inner(real_name, nickname, role)")
    .eq("class_id", cls.id)
    .order("number");
  type Enr = { student_id: string; number: number; profiles: { real_name: string | null; nickname: string | null; role: string } };
  const rows = ((enr ?? []) as unknown as Enr[]).filter((e) => e.profiles.role === "student");
  const ids = rows.map((r) => r.student_id);

  const today = dayKeyKST();
  const week = weekOf(today);
  const weekSince = new Date(`${week.start}T00:00:00+09:00`).getTime();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  type Att = { student_id: string; kind: string; mode: string; level: number; keystrokes: number; created_at: string };
  const attempts: Att[] = [];
  const [progress, clears, missions] = await Promise.all([
    ids.length ? admin.from("track_progress").select("student_id, track, unlocked_level").in("student_id", ids) : Promise.resolve({ data: [] }),
    ids.length
      ? admin.from("level_clears").select("student_id, track, level").in("student_id", ids).in("track", ["lesson", "binary"])
      : Promise.resolve({ data: [] }),
    ids.length ? admin.from("mission_completions").select("student_id").in("student_id", ids).eq("day", today) : Promise.resolve({ data: [] }),
    // 최근 30일 기록 (1000개씩 나눠 읽기)
    (async () => {
      if (!ids.length) return;
      for (let page = 0; page < 30; page++) {
        const { data } = await admin
          .from("attempts")
          .select("student_id, kind, mode, level, keystrokes, created_at")
          .in("student_id", ids)
          .eq("suspicious", false)
          .neq("kind", "placement")
          .gte("created_at", since30)
          .order("created_at")
          .range(page * 1000, page * 1000 + 999);
        attempts.push(...((data ?? []) as Att[]));
        if (!data || data.length < 1000) break;
      }
    })(),
  ]);

  const doneToday = new Set(((missions.data ?? []) as { student_id: string }[]).map((m) => m.student_id));
  const students: DashStudent[] = rows.map((r) => {
    const stages = Object.fromEntries(TRACKS.map((t) => [t, 1])) as Record<Track, number>;
    for (const p of (progress.data ?? []) as { student_id: string; track: string; unlocked_level: number }[])
      if (p.student_id === r.student_id && TRACKS.includes(p.track as Track)) stages[p.track as Track] = p.unlocked_level;
    const mine = attempts.filter((a) => a.student_id === r.student_id);
    const w = EMPTY_WEEK();
    for (const a of mine) {
      if (Date.parse(a.created_at) < weekSince) continue;
      w.keystrokes += a.keystrokes;
      if (a.kind === "game") {
        if (a.mode === "rain" || a.mode === "runner" || a.mode === "boss" || a.mode === "race") w[a.mode]++;
      } else if (a.level === SUBJECT_LEVEL) w.explore++;
      else if (a.kind === "mission") w.mission++;
      else w.practice++;
    }
    const myClears = ((clears.data ?? []) as { student_id: string; track: string; level: number }[]).filter((c) => c.student_id === r.student_id);
    const last = mine.at(-1);
    return {
      id: r.student_id,
      number: r.number,
      realName: r.profiles.real_name,
      nickname: r.profiles.nickname,
      test: isTestNumber(r.number),
      stages,
      week: w,
      lessons: myClears.filter((c) => c.track === "lesson").length,
      binary: myClears.filter((c) => c.track === "binary").length,
      lastDay: last ? dayKeyKST(Date.parse(last.created_at)) : null,
      missionToday: doneToday.has(r.student_id),
    };
  });

  // 요약 (선생님 테스트 계정은 빼요)
  const real = students.filter((s) => !s.test);
  const sum = EMPTY_WEEK();
  for (const s of real) for (const k of Object.keys(sum) as (keyof WeekCounts)[]) sum[k] += s.week[k];
  const avgStage = Object.fromEntries(
    TRACKS.map((t) => [t, real.length ? Math.round((real.reduce((n, s) => n + s.stages[t], 0) / real.length) * 10) / 10 : 0]),
  ) as Record<Track, number>;
  const tierCounts = Object.fromEntries(
    TRACKS.map((t) => [t, Object.fromEntries(TIERS.map((tier) => [tier, real.filter((s) => tierOfStage(s.stages[t]) === tier).length]))]),
  ) as Record<Track, Record<Tier, number>>;

  return {
    classId: cls.id,
    grade: cls.grade,
    classNo: cls.class_no,
    students,
    summary: {
      members: real.length,
      activeWeek: real.filter((s) => s.lastDay !== null && s.lastDay >= week.start).length,
      missionToday: real.filter((s) => s.missionToday).length,
      week: sum,
      avgStage,
      tierCounts,
    },
  };
}
