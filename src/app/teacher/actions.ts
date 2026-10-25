"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { newJoinCode, newPin, pinEmail, pinPassword } from "@/lib/auth/pin";
import { ensureSchoolYear, getViewer } from "@/lib/auth/viewer";

export type ActionState = { ok: boolean; message: string; pins?: { number: number; name: string; pin: string }[] } | null;

async function teacherOrNull() {
  const v = await getViewer();
  return v?.role === "teacher" ? v : null;
}

/** 이 반이 교사의 학교 반인지 확인 */
async function ownClass(classId: string, schoolId: string) {
  const { data } = await createAdminClient()
    .from("classes")
    .select("id, school_years!inner(school_id)")
    .eq("id", classId)
    .eq("school_years.school_id", schoolId)
    .maybeSingle();
  return !!data;
}

export async function createClass(_: ActionState, formData: FormData): Promise<ActionState> {
  const t = await teacherOrNull();
  if (!t) return { ok: false, message: "교사만 할 수 있어요." };
  const grade = Number(formData.get("grade"));
  const classNo = Number(formData.get("classNo"));
  if (!(grade >= 1 && grade <= 6) || !(classNo >= 1 && classNo <= 30)) return { ok: false, message: "학년과 반을 확인해 주세요." };

  const { schoolYearId, year } = await ensureSchoolYear();
  const admin = createAdminClient();
  for (let i = 0; i < 5; i++) {
    const { error } = await admin
      .from("classes")
      .insert({ school_year_id: schoolYearId, grade, class_no: classNo, join_code: newJoinCode() });
    if (!error) {
      revalidatePath("/teacher");
      return { ok: true, message: `${year}학년도 ${grade}학년 ${classNo}반을 만들었어요.` };
    }
    if (error.message.includes("school_year_id")) return { ok: false, message: "이미 있는 반이에요." };
    // join_code 가 겹치면 다시 시도
  }
  return { ok: false, message: "반을 만들지 못했어요. 다시 시도해 주세요." };
}

/**
 * PIN 로그인 학생 등록. 한 줄에 "번호 이름" (예: 1 김타닥).
 * 만든 PIN은 이때 한 번만 보여 줍니다 (서버에는 PIN 자체를 저장하지 않음).
 */
export async function addPinStudents(_: ActionState, formData: FormData): Promise<ActionState> {
  const t = await teacherOrNull();
  if (!t) return { ok: false, message: "교사만 할 수 있어요." };
  const classId = String(formData.get("classId"));
  if (!(await ownClass(classId, t.schoolId))) return { ok: false, message: "반을 찾을 수 없어요." };

  const rows = String(formData.get("roster") ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d{1,2})[\s,.\t]+(.+)$/);
      return m ? { number: Number(m[1]), name: m[2].trim() } : null;
    });
  if (rows.length === 0 || rows.some((r) => !r)) return { ok: false, message: '한 줄에 "번호 이름" 형식으로 적어 주세요. 예: 1 김타닥' };

  const admin = createAdminClient();
  const pins: { number: number; name: string; pin: string }[] = [];
  const skipped: number[] = [];

  for (const r of rows as { number: number; name: string }[]) {
    const { data: taken } = await admin.from("enrollments").select("id").eq("class_id", classId).eq("number", r.number).maybeSingle();
    if (taken) {
      skipped.push(r.number);
      continue;
    }
    const email = pinEmail(randomUUID());
    const created = await admin.auth.admin.createUser({ email, password: randomUUID(), email_confirm: true });
    if (created.error || !created.data.user) {
      skipped.push(r.number);
      continue;
    }
    const id = created.data.user.id;
    const pin = newPin();
    await admin.auth.admin.updateUserById(id, { password: pinPassword(id, pin) });
    await admin.from("profiles").insert({ id, role: "student", school_id: t.schoolId, real_name: r.name, email, login_method: "pin" });
    await admin.from("wallets").upsert({ student_id: id });
    await admin.from("enrollments").insert({ student_id: id, class_id: classId, number: r.number });
    pins.push({ ...r, pin });
  }

  revalidatePath(`/teacher/classes/${classId}`);
  const note = skipped.length ? ` (이미 있는 번호라 건너뜀: ${skipped.join(", ")}번)` : "";
  return { ok: true, message: `${pins.length}명을 등록했어요.${note} 아래 PIN은 지금만 보여요. 인쇄하거나 적어 두세요.`, pins };
}

export async function resetPin(_: ActionState, formData: FormData): Promise<ActionState> {
  const t = await teacherOrNull();
  if (!t) return { ok: false, message: "교사만 할 수 있어요." };
  const classId = String(formData.get("classId"));
  const studentId = String(formData.get("studentId"));
  if (!(await ownClass(classId, t.schoolId))) return { ok: false, message: "반을 찾을 수 없어요." };

  const admin = createAdminClient();
  const { data: enr } = await admin
    .from("enrollments")
    .select("id, number, profiles!inner(real_name, login_method)")
    .eq("class_id", classId)
    .eq("student_id", studentId)
    .maybeSingle();
  const p = enr?.profiles as unknown as { real_name: string; login_method: string } | undefined;
  if (!enr || p?.login_method !== "pin") return { ok: false, message: "PIN 로그인 학생이 아니에요." };

  const pin = newPin();
  await admin.auth.admin.updateUserById(studentId, { password: pinPassword(studentId, pin) });
  await admin.from("pin_failures").delete().eq("enrollment_id", enr.id);
  return { ok: true, message: `${enr.number}번 새 PIN`, pins: [{ number: enr.number, name: p.real_name, pin }] };
}
