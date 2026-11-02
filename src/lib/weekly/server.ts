import "server-only";

// 주간 챌린지 (서버 전용): 이번 주 기록을 세서 진행도를 보여 주고, 다 하면 보상을 한 번 받아요.

import { SUBJECT_LEVEL, TRACKS, type Track } from "@/config/game";
import { challengesOfWeek, WEEKLY, type WeekStats } from "@/config/weekly";
import { dayKeyKST } from "@/lib/practice/day";
import { addCoins } from "@/lib/practice/server";
import { weekOf } from "@/lib/season";
import { createAdminClient } from "@/lib/supabase/admin";

export type WeeklyItem = { id: string; icon: string; title: string; cur: number; goal: number; done: boolean; claimed: boolean };
export type WeeklyData = { week: { start: string; end: string }; items: WeeklyItem[]; reward: number; ready: boolean };

async function weekStats(userId: string, weekStart: string): Promise<WeekStats> {
  const since = new Date(`${weekStart}T00:00:00+09:00`).toISOString();
  const { data } = await createAdminClient()
    .from("attempts")
    .select("kind, track, level, accuracy, keystrokes, created_at")
    .eq("student_id", userId)
    .eq("suspicious", false)
    .neq("kind", "placement")
    .gte("created_at", since)
    .limit(2000);
  const rows = (data ?? []) as { kind: string; track: Track; level: number; accuracy: number | string; keystrokes: number; created_at: string }[];
  const practice = rows.filter((r) => r.kind !== "game");
  const byTrack = Object.fromEntries(TRACKS.map((t) => [t, 0])) as Record<Track, number>;
  for (const r of practice) if (r.level > 0) byTrack[r.track]++;
  return {
    rounds: practice.length,
    acc95: practice.filter((r) => Number(r.accuracy) >= 95).length,
    perfect: practice.filter((r) => Number(r.accuracy) >= 100 && r.keystrokes >= 60).length,
    days: new Set(rows.map((r) => dayKeyKST(Date.parse(r.created_at)))).size,
    games: rows.filter((r) => r.kind === "game").length,
    explore: practice.filter((r) => r.level === SUBJECT_LEVEL).length,
    byTrack,
  };
}

export async function loadWeekly(userId: string): Promise<WeeklyData> {
  const week = weekOf(dayKeyKST());
  const [stats, claims] = await Promise.all([
    weekStats(userId, week.start),
    createAdminClient().from("weekly_claims").select("challenge_id").eq("student_id", userId).eq("week_start", week.start),
  ]);
  const claimed = new Set((claims.data ?? []).map((c) => c.challenge_id));
  return {
    week,
    reward: WEEKLY.reward,
    ready: !claims.error,
    items: challengesOfWeek(week.start).map((c) => {
      const cur = Math.min(c.goal, c.count(stats));
      return { id: c.id, icon: c.icon, title: c.title, cur, goal: c.goal, done: cur >= c.goal, claimed: claimed.has(c.id) };
    }),
  };
}

/** 보상 받기: 이번 주 챌린지이고, 다 했고, 아직 안 받았을 때만 */
export async function claimWeekly(userId: string, challengeId: string): Promise<{ ok: true; coins: number } | { error: string }> {
  const data = await loadWeekly(userId);
  if (!data.ready) return { error: "주간 챌린지를 준비 중이에요. 선생님께 알려 주세요!" };
  const item = data.items.find((i) => i.id === challengeId);
  if (!item) return { error: "이번 주 챌린지가 아니에요." };
  if (!item.done) return { error: "아직 다 하지 않았어요." };
  const ins = await createAdminClient().from("weekly_claims").insert({ student_id: userId, week_start: data.week.start, challenge_id: challengeId });
  if (ins.error) return { error: "이미 보상을 받았어요." };
  await addCoins(userId, WEEKLY.reward, `주간 챌린지: ${item.title}`);
  return { ok: true, coins: WEEKLY.reward };
}
