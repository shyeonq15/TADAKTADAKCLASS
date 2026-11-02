"use server";

import { revalidatePath } from "next/cache";
import type { Track } from "@/config/game";
import { getViewer } from "@/lib/auth/viewer";
import { issueBossRecording, retireStudentBoss, saveBossRecording, type BossSubmission } from "@/lib/games/boss";
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
  // 학생 보스를 숨기면 내린 것과 같아요 (남은 상금은 만든 학생에게 돌려줘요)
  if (!active && (await retireStudentBoss(id, { schoolId: t.schoolId })).ok) return revalidatePath("/teacher/boss");
  await createAdminClient().from("boss_records").update({ active }).eq("id", id).eq("school_id", t.schoolId);
  revalidatePath("/teacher/boss");
}

export async function deleteBoss(formData: FormData) {
  const t = await teacher();
  if (!t) return;
  const id = String(formData.get("id"));
  await retireStudentBoss(id, { schoolId: t.schoolId }); // 학생 보스면 남은 상금을 먼저 돌려줘요
  await createAdminClient().from("boss_records").delete().eq("id", id).eq("school_id", t.schoolId);
  revalidatePath("/teacher/boss");
}
