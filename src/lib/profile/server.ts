import "server-only";

// 개인 프로필 (서버 전용).
// 내 프로필: 모든 정보 (최고 타수·보유 코인 포함).
// 반 친구 프로필: 공개 정보만 (티어·게임 점수·자기소개·미니미). 개인 타수는 보여 주지 않아요 (CLAUDE.md 6장).

import { PROFILE, TRACKS, type Tier, type Track } from "@/config/game";
import { MINIMI_SLOTS, SLOT_LABELS, minimiItem, type MinimiLook } from "@/config/shop";
import { checkNickname } from "@/lib/auth/nickname";
import { loadEnrollment, type Viewer } from "@/lib/auth/viewer";
import { bossRanks } from "@/lib/games/boss";
import { dayKeyKST } from "@/lib/practice/day";
import { streakDays } from "@/lib/practice/derive";
import type { Attempt } from "@/lib/practice/types";
import { allTiers, isCodeMaster, profileTier } from "@/lib/scoring/tier";
import { loadLooks } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LESSON_COUNT } from "@/data/codeNotes";
import { loadBadges, loadSeasonHistory, type SeasonRecord } from "@/lib/badges/server";

export type ProfileData = {
  id: string;
  mine: boolean;
  nickname: string;
  bio: string;
  classLabel: string;
  look: MinimiLook;
  equipped: { slot: string; name: string }[];
  stages: Record<Track, number>;
  tiers: Record<Track, Tier>;
  mainTier: Tier;
  codeMaster: boolean;
  bossTier: Tier | null;
  bossDefeated: number;
  gameBest: { rain: number; runner: number };
  lessonsDone: number;
  lessonCount: number;
  streak: number;
  missionToday: boolean;
  oldNicknames: { nickname: string; at: string }[];
  /** 모은 칭호 id */
  badges: string[];
  /** 시즌 기록 (최근 시즌부터) */
  seasons: SeasonRecord[];
  /** 가장 길게 이어서 연습한 날 */
  maxStreak: number;
  /** 내 프로필에서만 */
  private: null | {
    coins: number;
    bestCpm: Record<Track, { cpm: number; accuracy: number } | null>;
    /** 닉네임을 바꾸는 데 드는 코인 (처음 한 번은 0) */
    nicknamePrice: number;
    /** DB 준비(SQL 실행)가 됐는지 — 자기소개·닉네임 변경에 필요 */
    ready: boolean;
  };
};

/** 표·칸이 아직 없을 때 (선생님이 SQL 을 아직 실행하지 않음) */
const missing = (e: { code?: string } | null) => !!e && ["42P01", "PGRST205", "42703", "PGRST204"].includes(e.code ?? "");

/** 이 사람이 이 프로필을 볼 수 있는지: 나, 같은 반 친구, 같은 학교 선생님 */
async function canView(viewer: Viewer, targetId: string, targetClassId: string | null, targetSchoolId: string | null) {
  if (viewer.userId === targetId) return true;
  if (viewer.role === "teacher") return targetSchoolId === viewer.schoolId;
  return !!targetClassId && targetClassId === viewer.enrollment?.classId;
}

export async function loadProfile(viewer: Viewer, targetId: string): Promise<ProfileData | null> {
  const admin = createAdminClient();
  const mine = viewer.userId === targetId;

  let prof = await admin.from("profiles").select("nickname, bio, school_id, role").eq("id", targetId).maybeSingle();
  let ready = true;
  if (missing(prof.error)) {
    ready = false;
    prof = (await admin.from("profiles").select("nickname, school_id, role").eq("id", targetId).maybeSingle()) as typeof prof;
  }
  const p = prof.data as { nickname: string | null; bio?: string | null; school_id: string | null; role: string } | null;
  if (!p || p.role !== "student") return null;
  const enrollment = await loadEnrollment(targetId);
  if (!(await canView(viewer, targetId, enrollment?.classId ?? null, p.school_id))) return null;

  const [progress, lessons, attempts, mission, wallet, history, looks, ranks, badges, seasons] = await Promise.all([
    admin.from("track_progress").select("track, unlocked_level").eq("student_id", targetId),
    admin.from("level_clears").select("level", { count: "exact", head: true }).eq("student_id", targetId).eq("track", "lesson"),
    admin
      .from("attempts")
      .select("kind, track, mode, level, cpm, accuracy, score, created_at")
      .eq("student_id", targetId)
      .eq("suspicious", false)
      .order("created_at", { ascending: false })
      .limit(3000),
    admin.from("mission_completions").select("day").eq("student_id", targetId).eq("day", dayKeyKST()).maybeSingle(),
    mine ? admin.from("wallets").select("coins").eq("student_id", targetId).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("nickname_history").select("old_nickname, created_at").eq("student_id", targetId).order("created_at", { ascending: false }).limit(20),
    loadLooks([targetId]),
    bossRanks([targetId]),
    loadBadges(targetId),
    loadSeasonHistory(targetId, enrollment?.classId ?? null),
  ]);
  if (missing(history.error)) ready = false;

  const stages = Object.fromEntries(TRACKS.map((t) => [t, 1])) as Record<Track, number>;
  for (const r of progress.data ?? []) if (TRACKS.includes(r.track as Track)) stages[r.track as Track] = r.unlocked_level;
  const tiers = allTiers(stages);

  type Row = { kind: string; track: Track; mode: string; level: number; cpm: number; accuracy: number | string; score: number | null; created_at: string };
  const rows = (attempts.data ?? []) as Row[];
  const gameBest = (mode: string) => Math.max(0, ...rows.filter((a) => a.kind === "game" && a.mode === mode).map((a) => a.score ?? 0));
  // 최고 타수: 연습 트랙 단계 판(오늘의 미션 포함)만, 정확도 85% 이상
  const bestCpm = Object.fromEntries(
    TRACKS.map((t) => {
      const best = rows
        .filter((a) => a.track === t && a.level > 0 && (a.kind === "practice" || a.kind === "mission") && Number(a.accuracy) >= 85)
        .reduce<Row | null>((b, a) => (!b || a.cpm > b.cpm ? a : b), null);
      return [t, best ? { cpm: best.cpm, accuracy: Number(best.accuracy) } : null];
    }),
  ) as Record<Track, { cpm: number; accuracy: number } | null>;
  const streak = streakDays(rows.filter((a) => a.kind !== "placement").map((a) => ({ at: Date.parse(a.created_at) }) as Attempt));

  const look = looks[targetId] ?? {};
  const equipped = MINIMI_SLOTS.map((slot) => ({ slot: SLOT_LABELS[slot], name: minimiItem(look[slot])?.name ?? "" })).filter((e) => e.name);
  const oldNicknames = (history.data ?? []).map((h) => ({ nickname: h.old_nickname, at: h.created_at }));
  const rank = ranks.get(targetId);

  return {
    id: targetId,
    mine,
    nickname: p.nickname ?? "친구",
    bio: p.bio ?? "",
    classLabel: enrollment ? `${enrollment.grade}학년 ${enrollment.classNo}반` : "-",
    look,
    equipped,
    stages,
    tiers,
    mainTier: profileTier(tiers),
    codeMaster: isCodeMaster(tiers),
    bossTier: rank?.tier ?? null,
    bossDefeated: rank?.defeated ?? 0,
    gameBest: { rain: gameBest("rain"), runner: gameBest("runner") },
    lessonsDone: lessons.count ?? 0,
    lessonCount: LESSON_COUNT,
    streak,
    missionToday: !!mission.data,
    oldNicknames,
    badges: badges.earned,
    seasons,
    maxStreak: badges.stats.maxStreak,
    private: mine
      ? {
          coins: (wallet.data as { coins: number } | null)?.coins ?? 0,
          bestCpm,
          nicknamePrice: oldNicknames.length === 0 ? 0 : PROFILE.nicknameChangePrice,
          ready,
        }
      : null,
  };
}

/** 반 친구 목록 (프로필 링크용): 같은 반, 닉네임만 */
export async function classmates(viewer: Viewer) {
  const classId = viewer.enrollment?.classId;
  if (!classId) return [];
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("student_id, number, profiles!inner(nickname, role)")
    .eq("class_id", classId)
    .order("number");
  type Row = { student_id: string; profiles: { nickname: string | null; role: string } };
  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.profiles.role === "student")
    .map((r) => ({ id: r.student_id, nickname: r.profiles.nickname ?? "친구", me: r.student_id === viewer.userId }));
}

/* ───────── 고치기 ───────── */

const BANNED_BIO = ["시발", "씨발", "병신", "개새", "존나", "좆", "fuck", "shit"];

export async function saveBio(userId: string, raw: string): Promise<{ ok: true } | { error: string }> {
  const bio = raw.trim().replace(/\s+/g, " ").slice(0, PROFILE.bioMax);
  const lower = bio.toLowerCase().replace(/\s/g, "");
  if (BANNED_BIO.some((w) => lower.includes(w))) return { error: "친구가 기분 좋을 말로 바꿔 볼까요?" };
  const { error } = await createAdminClient().from("profiles").update({ bio: bio || null }).eq("id", userId);
  if (error) return { error: missing(error) ? "자기소개를 준비 중이에요. 선생님께 알려 주세요!" : "저장하지 못했어요. 다시 해 주세요." };
  return { ok: true };
}

export async function changeNickname(viewer: Viewer, raw: string): Promise<{ ok: true; cost: number } | { error: string }> {
  const nick = checkNickname(raw);
  if (!nick.ok) return { error: nick.message };
  const classId = viewer.enrollment?.classId;
  const admin = createAdminClient();
  // 같은 반에 같은 닉네임이 있으면 안 됨
  if (classId) {
    const { data: mates } = await admin
      .from("enrollments")
      .select("student_id, profiles!inner(nickname)")
      .eq("class_id", classId)
      .neq("student_id", viewer.userId)
      .eq("profiles.nickname", nick.value);
    if (mates && mates.length > 0) return { error: "우리 반에 같은 닉네임이 있어요. 다른 닉네임을 골라 주세요." };
  }
  const { data: res, error } = await admin.rpc("change_nickname", {
    p_student: viewer.userId,
    p_new: nick.value,
    p_price: PROFILE.nicknameChangePrice,
  });
  if (error) return { error: missing(error) || error.code === "PGRST202" ? "닉네임 변경권을 준비 중이에요. 선생님께 알려 주세요!" : "바꾸지 못했어요. 다시 해 주세요." };
  if (res === "same") return { error: "지금 닉네임과 같아요." };
  if (res === "poor") return { error: `코인이 부족해요. 닉네임 변경권은 ${PROFILE.nicknameChangePrice}코인이에요.` };
  const { data: last } = await admin
    .from("nickname_history")
    .select("cost")
    .eq("student_id", viewer.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { ok: true, cost: last?.cost ?? 0 };
}
