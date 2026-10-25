"use server";

import { revalidatePath } from "next/cache";
import type { Track } from "@/config/game";
import { getViewer } from "@/lib/auth/viewer";
import { issueBossRecording, saveBossRecording, type BossSubmission } from "@/lib/games/boss";
import { createAdminClient } from "@/lib/supabase/admin";

async function teacher() {
  const v = await getViewer();
  return v?.role === "teacher" ? v : null;
}

/** 보스 기록 시작: 서버가 지문을 내줌 */
export async function startBossRecording(track: Track, stage: number, title: string) {
  const t = await teacher();
  if (!t) return { error: "교사만 할 수 있어요." };
  return issueBossRecording(t.userId, track, stage, title);
}

/** 다 친 기록을 보스로 저장 */
export async function saveBoss(sub: BossSubmission & { timeline: [number, number][] }) {
  const t = await teacher();
  if (!t) return { error: "교사만 할 수 있어요." };
  const r = await saveBossRecording({ userId: t.userId, schoolId: t.schoolId }, sub);
  revalidatePath("/teacher/boss");
  return r;
}

/** 보스 켜기·끄기 (학생 목록에 보일지) */
export async function toggleBoss(formData: FormData) {
  const t = await teacher();
  if (!t) return;
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await createAdminClient().from("boss_records").update({ active }).eq("id", id).eq("school_id", t.schoolId);
  revalidatePath("/teacher/boss");
}

export async function deleteBoss(formData: FormData) {
  const t = await teacher();
  if (!t) return;
  await createAdminClient().from("boss_records").delete().eq("id", String(formData.get("id"))).eq("school_id", t.schoolId);
  revalidatePath("/teacher/boss");
}
