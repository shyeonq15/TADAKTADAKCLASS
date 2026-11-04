import "server-only";

// 명예의 전당 (서버 전용). CLAUDE.md 6장: 공개 화면에 개인 타수 순위는 금지, 명예의 전당만 예외.
// 같은 학년 안에서 부문별 상위 N명을 닉네임으로만 보여 줘요. (선생님 확인 대기·무효 기록은 빼요)

import { GAME_LABELS, HALL, TIER_LABELS, TIERS, TOP_TIER, TRACK_LABELS, TRACKS, type Tier, type Track } from "@/config/game";
import { bossRanks } from "@/lib/games/boss";
import { isTestNumber } from "@/lib/auth/testAccount";
import { dayKeyKST } from "@/lib/practice/day";
import { daysLeft, seasonOf, weekOf, type Season } from "@/lib/season";
import { classesOf } from "@/lib/battle/server";
import { STAGE_COUNT, stageName, tierOfStage } from "@/lib/practice/stages";
import { createAdminClient } from "@/lib/supabase/admin";

export type HallEntry = { studentId: string; nickname: string; classNo: number; value: string; tier?: Tier; me: boolean };
export type HallBoard = { id: string; title: string; note: string; entries: HallEntry[] };
export type HallData = { grade: number; boards: HallBoard[]; season: Season & { daysLeft: number } };

type Who = { studentId: string; nickname: string; classNo: number };

/** 명예의 전당은 타자 기록만 (교사 결정 2026-11-04): 뜻 비는 영어 과목 점수로 */
const HALL_GAMES = (Object.keys(GAME_LABELS) as (keyof typeof GAME_LABELS)[]).filter((g) => g !== "vocab");

/** 학생별 가장 좋은 기록 하나만 남기고 위에서부터 N명 */
function topPerStudent<T extends { student_id: string }>(rows: T[], better: (a: T, b: T) => number): T[] {
  const best = new Map<string, T>();
  for (const r of rows) {
    const cur = best.get(r.student_id);
    if (!cur || better(r, cur) < 0) best.set(r.student_id, r);
  }
  return [...best.values()].sort(better).slice(0, HALL.size);
}

/** 성장 점수 합 (기간 안). 행이 많을 수 있어서 1000개씩 나눠 읽어요 */
async function growthSums(ids: string[], from: string, to: string) {
  const admin = createAdminClient();
  const sums = new Map<string, number>();
  for (let page = 0; page < 20; page++) {
    const { data } = await admin
      .from("growth_scores")
      .select("student_id, total")
      .in("student_id", ids)
      .gte("day", from)
      .lte("day", to)
      .order("student_id")
      .order("day")
      .range(page * 1000, page * 1000 + 999);
    for (const r of data ?? []) sums.set(r.student_id, (sums.get(r.student_id) ?? 0) + r.total);
    if (!data || data.length < 1000) break;
  }
  return sums;
}

export async function loadHall(opts: { schoolYearId: string; grade: number; myId?: string | null }): Promise<HallData> {
  const admin = createAdminClient();
  const classes = await classesOf(opts.schoolYearId, opts.grade);
  const classIds = classes.map((c) => c.id);
  const today = dayKeyKST();
  const season = { ...seasonOf(today), daysLeft: daysLeft(seasonOf(today), today) };
  if (!classIds.length) return { grade: opts.grade, boards: [], season };

  const { data: enr } = await admin
    .from("enrollments")
    .select("student_id, class_id, number, profiles!inner(nickname, role)")
    .in("class_id", classIds);
  type Enr = { student_id: string; class_id: string; number: number; profiles: { nickname: string | null; role: string } };
  const people = new Map<string, Who>();
  for (const e of (enr ?? []) as unknown as Enr[]) {
    if (e.profiles.role !== "student" || isTestNumber(e.number)) continue; // 선생님 테스트 계정은 빼요
    people.set(e.student_id, {
      studentId: e.student_id,
      nickname: e.profiles.nickname ?? "친구",
      classNo: classes.find((c) => c.id === e.class_id)?.class_no ?? 0,
    });
  }
  const ids = [...people.keys()];
  if (!ids.length) return { grade: opts.grade, boards: [], season };

  // 확인된 기록만: 의심 없음 (pending·rejected 는 suspicious 가 true 로 남아 있어요)
  const base = () =>
    admin
      .from("attempts")
      .select("student_id, track, mode, cpm, accuracy, keystrokes, score")
      .in("student_id", ids)
      .eq("suspicious", false);

  const week = weekOf(today);
  const [speed, symbolAcc, games, progress, topClears, bosses, weekGrowth, seasonGrowth] = await Promise.all([
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
      HALL_GAMES.map((g) =>
        base().eq("kind", "game").eq("mode", g).not("score", "is", null).order("score", { ascending: false }).limit(300),
      ),
    ),
    admin.from("track_progress").select("student_id, track, unlocked_level").in("student_id", ids),
    // 마지막 단계를 실제로 깼는지 (열기만 한 것과 구분)
    admin.from("level_clears").select("student_id, track").eq("level", STAGE_COUNT).in("student_id", ids),
    bossRanks(ids),
    growthSums(ids, week.start, week.end),
    growthSums(ids, season.start, season.end),
  ]);

  type Row = { student_id: string; track: Track; mode: string; cpm: number; accuracy: number | string; keystrokes: number; score: number | null };
  const entry = (r: { student_id: string }, value: string, tier?: Tier): HallEntry => ({
    ...people.get(r.student_id)!,
    value,
    tier,
    me: r.student_id === opts.myId,
  });

  const boards: HallBoard[] = [];

  // 성장왕: 타수가 아니라 "내 평균보다 얼마나 나아졌는지"(성장 점수) 합. 느린 친구도 1등 할 수 있어요
  const growthBoard = (id: string, title: string, note: string, sums: Map<string, number>) => {
    const rows = [...sums.entries()]
      .filter(([, total]) => total > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, HALL.size)
      .map(([student_id, total]) => ({ student_id, total }));
    boards.push({ id, title, note, entries: rows.map((r) => entry(r, `${r.total}점`)) });
  };
  growthBoard("growth-week", "🌱 이번 주 성장왕", `${week.start.slice(5)} ~ ${week.end.slice(5)} 성장 점수 합 · 빠르기가 아니라 나아진 만큼!`, weekGrowth);
  growthBoard("growth-season", `🌳 시즌 ${season.n} 성장왕`, `${season.start.slice(5)} ~ ${season.end.slice(5)} 성장 점수 합 · 시즌마다 새로 시작해요`, seasonGrowth);

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
    // 가장 높은 단계 (네 트랙 중 최고). 마지막 단계를 깨면 "그랜드마스터 정상"
    // 같은 단계면: 그 단계에 오른 트랙이 많은 순 → 네 트랙 단계를 더한 값이 큰 순
    const done = new Set((topClears.data ?? []).map((c) => `${c.student_id}:${c.track}`));
    const height = (p: { student_id: string; track: string; unlocked_level: number }) =>
      p.unlocked_level + (p.unlocked_level >= STAGE_COUNT && done.has(`${p.student_id}:${p.track}`) ? 1 : 0);
    type Best = { student_id: string; stage: number; track: Track; tracks: number; total: number };
    const best = new Map<string, Best>();
    for (const p of progress.data ?? []) {
      const h = height(p);
      const cur = best.get(p.student_id) ?? { student_id: p.student_id, stage: 0, track: p.track as Track, tracks: 0, total: 0 };
      cur.total += h;
      if (h > cur.stage) Object.assign(cur, { stage: h, track: p.track as Track, tracks: 1 });
      else if (h === cur.stage) cur.tracks++;
      best.set(p.student_id, cur);
    }
    const rows = [...best.values()]
      .filter((r) => r.stage > 1)
      .sort((a, b) => b.stage - a.stage || b.tracks - a.tracks || b.total - a.total)
      .slice(0, HALL.size);
    const where = (r: Best) => (r.tracks > 1 ? `${r.tracks}개 트랙` : TRACK_LABELS[r.track]);
    const label = (r: Best) => (r.stage > STAGE_COUNT ? `${TIER_LABELS[TOP_TIER]} 정상` : stageName(r.stage));
    boards.push({
      id: "stage",
      title: "최고 단계 도달",
      note: "네 트랙 중 가장 높이 올라간 단계 · 같으면 그 단계에 오른 트랙이 많은 순",
      entries: rows.map((r) => entry(r, `${where(r)} ${label(r)}`, tierOfStage(Math.min(r.stage, STAGE_COUNT)))),
    });
  }

  {
    // 보스 헌터: 격파한 보스 중 가장 높은 티어 → 같으면 격파한 보스 수
    const rows = [...bosses.entries()]
      .filter(([, r]) => r.tier !== null)
      .map(([student_id, r]) => ({ student_id, tier: r.tier as Tier, defeated: r.defeated }))
      .sort((a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier) || b.defeated - a.defeated)
      .slice(0, HALL.size);
    boards.push({
      id: "boss",
      title: "보스 헌터",
      note: "격파한 보스 중 가장 높은 티어 · 같으면 격파한 보스 수",
      entries: rows.map((r) => entry(r, `${TIER_LABELS[r.tier]} 보스 · ${r.defeated}마리 격파`, r.tier)),
    });
  }

  HALL_GAMES.forEach((g, i) => {
    const rows = topPerStudent((games[i].data ?? []) as Row[], (a, b) => (b.score ?? 0) - (a.score ?? 0));
    boards.push({
      id: `game-${g}`,
      title: `${GAME_LABELS[g]} 최고 점수`,
      note: "트랙 상관없이",
      entries: rows.map((r) => entry(r, `${r.score}점`)),
    });
  });

  return { grade: opts.grade, boards, season };
}

/** 학생: 내 학년 명예의 전당 */
export async function loadMyHall(userId: string, enrollment: { schoolYearId: string; grade: number } | null) {
  if (!enrollment) return null;
  return loadHall({ schoolYearId: enrollment.schoolYearId, grade: enrollment.grade, myId: userId });
}
