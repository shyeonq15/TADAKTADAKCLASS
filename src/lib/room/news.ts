import "server-only";

// 우리 반 소식 (서버 전용): 최근 며칠 동안 반 친구들이 해낸 일을 모아 보여 줘요.
// 따로 표를 두지 않고 기록(단계 통과·보스 격파·강의 통과·미션)에서 만들어요. 타수 숫자는 넣지 않아요.

import { STEPS_PER_TIER, TIER_LABELS, TIERS, TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { LESSON_COUNT } from "@/data/codeNotes";
import { STAGE_COUNT } from "@/lib/practice/stages";
import { cpmTier } from "@/lib/scoring/tier";
import { createAdminClient } from "@/lib/supabase/admin";
import { josa, particle } from "@/lib/josa";

export type NewsItem = { at: string; icon: string; text: string };

/** 며칠 전 소식까지 보여 줄지, 몇 개까지 */
const NEWS_DAYS = 7;
const NEWS_MAX = 20;

export async function loadClassNews(classId: string): Promise<NewsItem[]> {
  const admin = createAdminClient();
  const { data: enr } = await admin
    .from("enrollments")
    .select("student_id, profiles!inner(nickname, role)")
    .eq("class_id", classId);
  type Enr = { student_id: string; profiles: { nickname: string | null; role: string } };
  const people = new Map(
    ((enr ?? []) as unknown as Enr[]).filter((e) => e.profiles.role === "student").map((e) => [e.student_id, e.profiles.nickname ?? "친구"]),
  );
  const ids = [...people.keys()];
  if (!ids.length) return [];
  const since = new Date(Date.now() - NEWS_DAYS * 86400000).toISOString();

  const [clears, defeats] = await Promise.all([
    admin.from("level_clears").select("student_id, track, level, cleared_at").in("student_id", ids).gte("cleared_at", since).limit(1000),
    admin.from("boss_defeats").select("student_id, defeated_at, boss_records!inner(title, track, cpm)").in("student_id", ids).gte("defeated_at", since).limit(300),
  ]);

  const news: NewsItem[] = [];
  const name = (id: string) => people.get(id) ?? "친구";

  for (const c of clears.data ?? []) {
    const nick = name(c.student_id);
    if (TRACKS.includes(c.track as Track)) {
      // 한 티어의 마지막(5단계)을 깨면 다음 티어로 승급
      if (c.level % STEPS_PER_TIER !== 0) continue;
      const next = TIERS[c.level / STEPS_PER_TIER];
      news.push({
        at: c.cleared_at,
        icon: c.level >= STAGE_COUNT ? "👑" : "⬆️",
        text:
          c.level >= STAGE_COUNT
            ? `${josa(nick, "이", "가")} ${TRACK_LABELS[c.track as Track]} 레전드 정상에 올랐다!`
            : `${josa(nick, "이", "가")} ${TRACK_LABELS[c.track as Track]} ${TIER_LABELS[next]} 티어로 승급했다!`,
      });
    } else if (c.track === "lesson" && c.level === LESSON_COUNT) {
      news.push({ at: c.cleared_at, icon: "🎓", text: `${josa(nick, "이", "가")} 파이썬 첫걸음을 모두 들었다!` });
    } else if (c.track === "lesson" && c.level % 10 === 0) {
      news.push({ at: c.cleared_at, icon: "📘", text: `${josa(nick, "이", "가")} 파이썬 첫걸음 ${c.level}강을 통과했다!` });
    }
  }

  type Def = { student_id: string; defeated_at: string; boss_records: { title: string; track: string; cpm: number } | { title: string; track: string; cpm: number }[] };
  for (const d of (defeats.data ?? []) as unknown as Def[]) {
    const b = Array.isArray(d.boss_records) ? d.boss_records[0] : d.boss_records;
    if (!b) continue;
    news.push({
      at: d.defeated_at,
      icon: "👾",
      text: `${josa(name(d.student_id), "이", "가")} ${TIER_LABELS[cpmTier(b.track as Track, b.cpm)]} 보스 "${b.title}"${particle(b.title, "을", "를")} 격파했다!`,
    });
  }

  return news.sort((a, b) => b.at.localeCompare(a.at)).slice(0, NEWS_MAX);
}
