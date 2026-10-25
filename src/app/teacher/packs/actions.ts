"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TRACKS, type Track } from "@/config/game";
import { getViewer } from "@/lib/auth/viewer";
import { dayKeyKST } from "@/lib/practice/day";
import { splitPassage } from "@/lib/passages/split";
import { createAdminClient } from "@/lib/supabase/admin";

export type PackState = { ok: boolean; message: string } | null;

async function teacher() {
  const v = await getViewer();
  return v?.role === "teacher" ? v : null;
}

/** 이 연습팩이 이 교사의 학교 것인지 */
async function ownPack(packId: string, schoolId: string) {
  const { data } = await createAdminClient().from("packs").select("id").eq("id", packId).eq("school_id", schoolId).maybeSingle();
  return !!data;
}

async function ownClass(classId: string, schoolId: string) {
  const { data } = await createAdminClient()
    .from("classes")
    .select("id, school_years!inner(school_id)")
    .eq("id", classId)
    .eq("school_years.school_id", schoolId)
    .maybeSingle();
  return !!data;
}

/** 붙여 넣은 글로 연습팩 만들기 (나누기는 서버에서 다시 함) */
export async function createPack(_: PackState, formData: FormData): Promise<PackState> {
  const t = await teacher();
  if (!t) return { ok: false, message: "교사만 할 수 있어요." };
  const title = String(formData.get("title") ?? "").trim().slice(0, 40);
  const track = String(formData.get("track")) as Track;
  const text = String(formData.get("text") ?? "").slice(0, 20000);
  if (!title) return { ok: false, message: "연습팩 이름을 적어 주세요." };
  if (!TRACKS.includes(track)) return { ok: false, message: "트랙을 골라 주세요." };

  const { mode, rounds } = splitPassage(text, track);
  if (rounds.length === 0) return { ok: false, message: "붙여 넣은 글이 없어요." };

  const admin = createAdminClient();
  const pack = await admin
    .from("packs")
    .insert({ school_id: t.schoolId, owner_id: t.userId, title, track, visibility: "school" })
    .select("id")
    .single();
  if (pack.error) return { ok: false, message: "저장하지 못했어요. 다시 해 주세요." };
  const ins = await admin
    .from("passages")
    .insert(rounds.map((lines, i) => ({ pack_id: pack.data.id, mode, body: lines.join("\n"), sort: i })));
  if (ins.error) {
    await admin.from("packs").delete().eq("id", pack.data.id);
    return { ok: false, message: "저장하지 못했어요. 다시 해 주세요." };
  }
  revalidatePath("/teacher/packs");
  redirect(`/teacher/packs/${pack.data.id}`);
}

export async function deletePack(formData: FormData) {
  const t = await teacher();
  const packId = String(formData.get("packId"));
  if (!t || !(await ownPack(packId, t.schoolId))) return;
  await createAdminClient().from("packs").delete().eq("id", packId);
  revalidatePath("/teacher/packs");
  redirect("/teacher/packs");
}

/** 반에 배포 / 배포 취소 / 오늘의 미션으로 지정 */
export async function setAssignment(formData: FormData) {
  const t = await teacher();
  const packId = String(formData.get("packId"));
  const classId = String(formData.get("classId"));
  const action = String(formData.get("action"));
  if (!t || !(await ownPack(packId, t.schoolId)) || !(await ownClass(classId, t.schoolId))) return;

  const admin = createAdminClient();
  if (action === "remove") {
    await admin.from("pack_assignments").delete().eq("pack_id", packId).eq("class_id", classId);
  } else if (action === "mission") {
    // 한 반에 오늘의 미션은 하나만: 같은 날 다른 연습팩 지정은 풀기
    const today = dayKeyKST();
    await admin.from("pack_assignments").update({ mission_day: null }).eq("class_id", classId).eq("mission_day", today);
    await admin.from("pack_assignments").upsert({ pack_id: packId, class_id: classId, mission_day: today });
  } else if (action === "unmission") {
    await admin.from("pack_assignments").update({ mission_day: null }).eq("pack_id", packId).eq("class_id", classId);
  } else {
    await admin.from("pack_assignments").upsert({ pack_id: packId, class_id: classId });
  }
  revalidatePath(`/teacher/packs/${packId}`);
}
