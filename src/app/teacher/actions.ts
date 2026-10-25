"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { newJoinCode, pinEmail } from "@/lib/auth/pin";
import { ensureSchoolYear, getViewer } from "@/lib/auth/viewer";

export type ActionState = { ok: boolean; message: string } | null;

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
 * 학생 명단 등록. 한 줄에 "번호 이름" (예: 1 김타닥).
 * 비밀번호는 학생이 처음 로그인할 때 그림 4개로 직접 정합니다.
 */
export async function addStudents(_: ActionState, formData: FormData): Promise<ActionState> {
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
  let added = 0;
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
    await admin.from("profiles").insert({ id, role: "student", school_id: t.schoolId, real_name: r.name, email, login_method: "pin", secret_set: false });
    await admin.from("wallets").upsert({ student_id: id });
    await admin.from("enrollments").insert({ student_id: id, class_id: classId, number: r.number });
    added++;
  }

  revalidatePath(`/teacher/classes/${classId}`);
  const note = skipped.length ? ` (이미 있는 번호라 건너뜀: ${skipped.join(", ")}번)` : "";
  return { ok: true, message: `${added}명을 등록했어요.${note} 학생은 학번으로 들어와서 그림 비밀번호를 직접 정해요.` };
}

/** 비밀번호 초기화: 학생이 다음 로그인 때 그림 비밀번호를 다시 정함 (허용이 켜져 있어야 함) */
export async function resetSecret(_: ActionState, formData: FormData): Promise<ActionState> {
  const t = await teacherOrNull();
  if (!t) return { ok: false, message: "교사만 할 수 있어요." };
  const classId = String(formData.get("classId"));
  const studentId = String(formData.get("studentId"));
  if (!(await ownClass(classId, t.schoolId))) return { ok: false, message: "반을 찾을 수 없어요." };

  const admin = createAdminClient();
  const { data: enr } = await admin.from("enrollments").select("id").eq("class_id", classId).eq("student_id", studentId).maybeSingle();
  if (!enr) return { ok: false, message: "학생을 찾을 수 없어요." };

  // 예전 비밀번호로는 못 들어오게 무작위 값으로 바꾸고, "아직 안 정함"으로 표시
  await admin.auth.admin.updateUserById(studentId, { password: randomUUID() });
  await admin.from("profiles").update({ secret_set: false }).eq("id", studentId);
  await admin.from("pin_failures").delete().eq("enrollment_id", enr.id);
  revalidatePath(`/teacher/classes/${classId}`);
  return { ok: true, message: "초기화했어요" };
}

/** 반마다 "처음 비밀번호 정하기 허용" 켜기·끄기 */
export async function toggleSecretSetup(formData: FormData) {
  const t = await teacherOrNull();
  if (!t) return;
  const classId = String(formData.get("classId"));
  if (!(await ownClass(classId, t.schoolId))) return;
  const open = formData.get("open") === "true";
  await createAdminClient().from("classes").update({ allow_secret_setup: open }).eq("id", classId);
  revalidatePath(`/teacher/classes/${classId}`);
}
