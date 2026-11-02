import "server-only";

// 칭호 계산에 필요한 기록 모으기 (서버 전용). 표를 따로 두지 않고, 볼 때마다 기록에서 다시 계산해요.

import { SEASON_FINISH_DAYS, earnedBadges, type BadgeStats } from "@/config/badges";
import { TRACKS, type Track } from "@/config/game";
import { LESSON_COUNT } from "@/data/codeNotes";
import { bossRanks } from "@/lib/games/boss";
import { dayKeyKST } from "@/lib/practice/day";
import { allTiers } from "@/lib/scoring/tier";
import { seasonByNumber, seasonOf } from "@/lib/season";
import { createAdminClient } from "@/lib/supabase/admin";
import { exploreTotals } from "@/lib/explore/server";

const DAY = 86400000;

/** 가장 길게 이어진 날 수 */
function longestRun(days: string[]) {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev = 0;
  for (const d of sorted) {
    const ms = Date.parse(`${d}T00:00:00Z`);
    run = prev && ms - prev === DAY ? run + 1 : 1;
    best = Math.max(best, run);
    prev = ms;
  }
  return best;
}

export async function loadBadgeStats(studentId: string): Promise<BadgeStats> {
  const admin = createAdminClient();
  const [attempts, missions, lessons, progress, raceWins, feedback, ranks, explore, weekly] = await Promise.all([
    admin
      .from("attempts")
      .select("kind, accuracy, keystrokes, created_at")
      .eq("student_id", studentId)
      .eq("suspicious", false)
      .neq("kind", "placement")
      .order("created_at", { ascending: false })
      .limit(5000),
    admin.from("mission_completions").select("day", { count: "exact", head: true }).eq("student_id", studentId),
    admin.from("level_clears").select("level", { count: "exact", head: true }).eq("student_id", studentId).eq("track", "lesson"),
    admin.from("track_progress").select("track, unlocked_level").eq("student_id", studentId),
    admin.from("coin_transactions").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("reason", "친구 대결 우승"),
    admin.from("feedback").select("id", { count: "exact", head: true }).eq("student_id", studentId).eq("status", "done"),
    bossRanks([studentId]),
    exploreTotals(studentId),
    admin.from("weekly_claims").select("challenge_id", { count: "exact", head: true }).eq("student_id", studentId),
  ]);

  const rows = (attempts.data ?? []) as { kind: string; accuracy: number | string; keystrokes: number; created_at: string }[];
  const days = rows.map((a) => dayKeyKST(Date.parse(a.created_at)));
  const practice = rows.filter((a) => a.kind === "practice" || a.kind === "mission" || a.kind === "weak");

  // 시즌 완주: 지난 시즌 + 이번 시즌 중 SEASON_FINISH_DAYS 일 이상 연습한 시즌 수
  const perSeason = new Map<number, Set<string>>();
  for (const d of days) {
    const n = seasonOf(d).n;
    if (n < 1) continue;
    if (!perSeason.has(n)) perSeason.set(n, new Set());
    perSeason.get(n)!.add(d);
  }

  const stages = Object.fromEntries(TRACKS.map((t) => [t, 1])) as Record<Track, number>;
  for (const r of progress.data ?? []) if (TRACKS.includes(r.track as Track)) stages[r.track as Track] = r.unlocked_level;
  const rank = ranks.get(studentId);

  return {
    maxStreak: longestRun(days),
    rounds: practice.length,
    perfect: practice.some((a) => Number(a.accuracy) >= 100 && a.keystrokes >= 60),
    missions: missions.count ?? 0,
    lessonsDone: lessons.count ?? 0,
    lessonCount: LESSON_COUNT,
    bossDefeated: rank?.defeated ?? 0,
    bossTier: rank?.tier ?? null,
    tiers: allTiers(stages),
    games: rows.filter((a) => a.kind === "game").length,
    raceWins: raceWins.count ?? 0,
    feedbackDone: feedback.error ? 0 : (feedback.count ?? 0),
    seasonsFinished: [...perSeason.values()].filter((s) => s.size >= SEASON_FINISH_DAYS).length,
    exploreStars: explore.stars,
    exploreUnits: explore.unitsCleared,
    weeklyClaims: weekly.error ? 0 : (weekly.count ?? 0),
  };
}

/** 이 학생이 모은 칭호 id 목록 */
export async function loadBadges(studentId: string) {
  const stats = await loadBadgeStats(studentId);
  return { stats, earned: earnedBadges(stats) };
}

export type SeasonRecord = { n: number; start: string; end: string; days: number; finished: boolean; classKing: boolean; current: boolean };

/**
 * 시즌 기록: 시즌마다 연습한 날 수, 완주했는지, 우리 반 성장 점수 1등이었는지 (같은 점수면 같이 1등).
 * 지금 진행 중인 시즌은 1등 표시를 하지 않아요 (끝나야 정해져요).
 */
export async function loadSeasonHistory(studentId: string, classId: string | null): Promise<SeasonRecord[]> {
  if (!classId) return [];
  const admin = createAdminClient();
  const today = dayKeyKST();
  const now = seasonOf(today);
  if (now.n < 1) return [];
  const first = seasonByNumber(1).start;

  // 우리 반 성장 점수 (1000개씩 나눠 읽기)
  const rows: { student_id: string; day: string; total: number }[] = [];
  for (let page = 0; page < 30; page++) {
    const { data } = await admin
      .from("growth_scores")
      .select("student_id, day, total")
      .eq("class_id", classId)
      .gte("day", first)
      .order("day")
      .order("student_id")
      .range(page * 1000, page * 1000 + 999);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const out: SeasonRecord[] = [];
  for (let n = 1; n <= now.n; n++) {
    const s = seasonByNumber(n);
    const inSeason = rows.filter((r) => r.day >= s.start && r.day <= s.end);
    const sums = new Map<string, number>();
    for (const r of inSeason) sums.set(r.student_id, (sums.get(r.student_id) ?? 0) + r.total);
    const mine = sums.get(studentId) ?? 0;
    const top = Math.max(0, ...sums.values());
    // 성장 점수 행은 연습한 날에만 생겨요
    const days = inSeason.filter((r) => r.student_id === studentId).length;
    const current = n === now.n;
    out.push({ ...s, days, finished: days >= SEASON_FINISH_DAYS, classKing: !current && mine > 0 && mine === top, current });
  }
  return out.reverse();
}
