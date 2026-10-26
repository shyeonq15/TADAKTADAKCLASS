import "server-only";

// 명예의 전당 (서버 전용). CLAUDE.md 6장: 공개 화면에 개인 타수 순위는 금지, 명예의 전당만 예외.
// 같은 학년 안에서 부문별 상위 N명을 닉네임으로만 보여 줘요. (선생님 확인 대기·무효 기록은 빼요)

import { GAME_LABELS, HALL, TRACK_LABELS, TRACKS, type Tier, type Track } from "@/config/game";
import { classesOf } from "@/lib/battle/server";
import { STAGE_COUNT, stageName, tierOfStage } from "@/lib/practice/stages";
import { createAdminClient } from "@/lib/supabase/admin";

export type HallEntry = { studentId: string; nickname: string; classNo: number; value: string; tier?: Tier; me: boolean };
export type HallBoard = { id: string; title: string; note: string; entries: HallEntry[] };
export type HallData = { grade: number; boards: HallBoard[] };

type Who = { studentId: string; nickname: string; classNo: number };

/** 학생별 가장 좋은 기록 하나만 남기고 위에서부터 N명 */
function topPerStudent<T extends { student_id: string }>(rows: T[], better: (a: T, b: T) => number): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const cur = best.get(r.student_id);
    if (!cur || better(r, cur) < 0) best.set(r.student_id, r);
  }
  return [...best.values()].sort(better).slice(0, HALL.size);
}

export async function loadHall(opts: { schoolYearId: string; grade: number; myId?: string | null }): Promise<HallData> {
  const admin = createAdminClient();
  const classes = await classesOf(opts.schoolYearId, opts.grade);
  const classIds = classes.map((c) => c.id);
  if (!classIds.length) return { grade: opts.grade, boards: [] };

  const { data: enr } = await admin
    .from("enrollments")
    .select("student_id, class_id, profiles!inner(nickname, role)")
    .in("class_id", classIds);
  type Enr = { student_id: string; class_id: string; profiles: { nickname: string | null; role: string } };
  const people = new Map<string, Who>();
  for (const e of (enr ?? []) as unknown as Enr[]) {
    if (e.profiles.role !== "student") continue;
    people.set(e.student_id, {
      studentId: e.student_id,
      nickname: e.profiles.nickname ?? "친구",
      classNo: classes.find((c) => c.id === e.class_id)?.class_no ?? 0,
    });
  }
  const ids = [...people.keys()];
  if (!ids.length) return { grade: opts.grade, boards: [] };

  // 확인된 기록만: 의심 없음 (pending·rejected 는 suspicious 가 true 로 남아 있어요)
  const base = () =>
    admin
      .from("attempts")
      .select("student_id, track, mode, cpm, accuracy, keystrokes, score")
      .in("student_id", ids)
      .eq("suspicious", false);

  const [speed, symbolAcc, games, progress] = await Promise.all([
    Promise.all(
      TRACKS.map((t) =>
        base()
          .eq("track", t)
          .in("kind", ["practice", "mission", "weak"])
          .gte("accuracy", HALL.minAccuracy)
          .order("cpm", { ascending: false })
          .limit(300),
      ),
    ),
    base()
      .eq("track", "symbol")
      .in("kind", ["practice", "mission", "weak"])
      .gte("keystrokes", HALL.minKeystrokes)
      .order("accuracy", { ascending: false })
      .order("cpm", { ascending: false })
      .limit(300),
    Promise.all(
      (Object.keys(GAME_LABELS) as (keyof typeof GAME_LABELS)[]).map((g) =>
        base().eq("kind", "game").eq("mode", g).not("score", "is", null).order("score", { ascending: false }).limit(300),
      ),
    ),
    admin.from("track_progress").select("student_id, track, unlocked_level").in("student_id", ids),
  ]);

  type Row = { student_id: string; track: Track; mode: string; cpm: number; accuracy: number | string; keystrokes: number; score: number | null };
  const entry = (r: { student_id: string }, value: string, tier?: Tier): HallEntry => ({
    ...people.get(r.student_id)!,
    value,
    tier,
    me: r.student_id === opts.myId,
  });

  const boards: HallBoard[] = [];

  TRACKS.forEach((t, i) => {
    const rows = topPerStudent((speed[i].data ?? []) as Row[], (a, b) => b.cpm - a.cpm || Number(b.accuracy) - Number(a.accuracy));
    boards.push({
      id: `speed-${t}`,
      title: `${TRACK_LABELS[t]} 최고 타수`,
      note: `정확도 ${HALL.minAccuracy}% 이상인 기록`,
      entries: rows.map((r) => entry(r, `${r.cpm}타`)),
    });
  });

  {
    const rows = topPerStudent(
      (symbolAcc.data ?? []) as Row[],
      (a, b) => Number(b.accuracy) - Number(a.accuracy) || b.cpm - a.cpm,
    );
    boards.push({
      id: "symbol-acc",
      title: "기호 정확도",
      note: `${HALL.minKeystrokes}타 이상 친 기록 · 같으면 타수가 높은 순`,
      entries: rows.map((r) => entry(r, `${Number(r.accuracy)}% · ${r.cpm}타`)),
    });
  }

  {
    // 가장 높은 단계 (네 트랙 중 최고). 마지막 단계까지 연 학생은 레전드 정복!
    const best = new Map<string, { student_id: string; stage: number; track: Track }>();
    for (const p of progress.data ?? []) {
      const cur = best.get(p.student_id);
      if (!cur || p.unlocked_level > cur.stage) best.set(p.student_id, { student_id: p.student_id, stage: p.unlocked_level, track: p.track as Track });
    }
    const rows = [...best.values()].filter((r) => r.stage > 1).sort((a, b) => b.stage - a.stage).slice(0, HALL.size);
    boards.push({
      id: "stage",
      title: "최고 단계 도달",
      note: "네 트랙 중 가장 높이 올라간 단계",
      entries: rows.map((r) =>
        entry(r, `${TRACK_LABELS[r.track]} ${r.stage >= STAGE_COUNT ? "레전드 정상" : stageName(r.stage)}`, tierOfStage(r.stage)),
      ),
    });
  }

  (Object.keys(GAME_LABELS) as (keyof typeof GAME_LABELS)[]).forEach((g, i) => {
    const rows = topPerStudent((games[i].data ?? []) as Row[], (a, b) => (b.score ?? 0) - (a.score ?? 0));
    boards.push({
      id: `game-${g}`,
      title: `${GAME_LABELS[g]} 최고 점수`,
      note: "트랙 상관없이",
      entries: rows.map((r) => entry(r, `${r.score}점`)),
    });
  });

  return { grade: opts.grade, boards };
}

/** 학생: 내 학년 명예의 전당 */
export async function loadMyHall(userId: string, enrollment: { schoolYearId: string; grade: number } | null) {
  if (!enrollment) return null;
  return loadHall({ schoolYearId: enrollment.schoolYearId, grade: enrollment.grade, myId: userId });
}
