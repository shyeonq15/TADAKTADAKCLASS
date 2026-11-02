import "server-only";

// 우리 반 협동 레이드 (서버 전용): 이번 주 반 친구들의 타수 합 = 보스에게 준 피해.
// 체력을 다 깎으면 처음 확인한 사람이 결과를 저장하고 보상을 나눠요 (반마다 주마다 한 번).

import { RAID } from "@/config/game";
import { isTestNumber } from "@/lib/auth/testAccount";
import { dayKeyKST } from "@/lib/practice/day";
import { addClassCoins, addCoins } from "@/lib/practice/server";
import { weekOf } from "@/lib/season";
import { createAdminClient } from "@/lib/supabase/admin";

export type RaidData = {
  week: { start: string; end: string };
  boss: { name: string; icon: string };
  hp: number;
  damage: number;
  members: number;
  /** 이번 주에 한 판이라도 친 친구 수 */
  joined: number;
  mine: number;
  defeated: boolean;
  /** SQL 전이면 false (보상 저장 불가, 진행률만 보여요) */
  ready: boolean;
};

const DAY = 86400000;

export async function loadRaid(classId: string, myId: string): Promise<RaidData> {
  const admin = createAdminClient();
  const week = weekOf(dayKeyKST());
  const weekNo = Math.floor(Date.parse(`${week.start}T00:00:00Z`) / (7 * DAY));
  const boss = RAID.bosses[weekNo % RAID.bosses.length];

  const { data: enr } = await admin.from("enrollments").select("student_id, number, profiles!inner(role)").eq("class_id", classId);
  type Enr = { student_id: string; number: number; profiles: { role: string } };
  const ids = ((enr ?? []) as unknown as Enr[]).filter((e) => e.profiles.role === "student" && !isTestNumber(e.number)).map((e) => e.student_id);
  const hp = Math.max(1, ids.length) * RAID.hpPerStudent;

  // 이번 주 타수 (한국 시간 월요일 0시부터). 행이 많을 수 있어서 1000개씩
  const since = new Date(`${week.start}T00:00:00+09:00`).toISOString();
  const per = new Map<string, number>();
  if (ids.length) {
    for (let page = 0; page < 20; page++) {
      const { data } = await admin
        .from("attempts")
        .select("student_id, keystrokes")
        .in("student_id", ids)
        .eq("suspicious", false)
        .neq("kind", "placement")
        .gte("created_at", since)
        .order("created_at")
        .range(page * 1000, page * 1000 + 999);
      for (const r of data ?? []) per.set(r.student_id, (per.get(r.student_id) ?? 0) + r.keystrokes);
      if (!data || data.length < 1000) break;
    }
  }
  const damage = [...per.values()].reduce((a, b) => a + b, 0);

  const { data: result, error } = await admin.from("raid_results").select("class_id").eq("class_id", classId).eq("week_start", week.start).maybeSingle();
  const ready = !error;
  let defeated = !!result;
  if (ready && !defeated && damage >= hp) {
    // 처음 쓰러뜨린 순간: 결과 저장 (동시에 두 명이 열어도 한 번만) → 보상
    const ins = await admin.from("raid_results").insert({ class_id: classId, week_start: week.start });
    defeated = true;
    if (!ins.error) {
      const contributors = [...per.entries()].filter(([, k]) => k >= RAID.minContribution).map(([id]) => id);
      await addClassCoins(classId, contributors[0] ?? myId, RAID.classReward, `협동 레이드: ${boss.name} 격파`);
      for (const id of contributors) await addCoins(id, RAID.personalReward, `협동 레이드: ${boss.name} 격파`);
    }
  }

  return { week, boss, hp, damage: Math.min(damage, hp), members: ids.length, joined: per.size, mine: per.get(myId) ?? 0, defeated, ready };
}
