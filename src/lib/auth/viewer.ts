import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authConfig, isTeacherEmail, schoolYearOf } from "./config";

// 지금 로그인한 사람(viewer) 정보를 읽는 곳. 서버 화면·서버 함수는 모두 여기를 거칩니다.

export type Enrollment = {
  id: string;
  classId: string;
  number: number;
  grade: number;
  classNo: number;
  joinCode: string;
};

export type Viewer = {
  userId: string;
  email: string;
  role: "student" | "teacher";
  nickname: string | null;
  realName: string | null;
  schoolId: string;
  loginMethod: "google" | "pin";
  /** 이번 학년도 반 (학생) */
  enrollment: Enrollment | null;
};

/** 학교와 이번 학년도 행이 없으면 만들기 */
export async function ensureSchoolYear() {
  const admin = createAdminClient();
  const { schoolName, allowedDomain } = authConfig();

  let { data: school } = await admin.from("schools").select("id").eq("name", schoolName).maybeSingle();
  if (!school) {
    const res = await admin.from("schools").insert({ name: schoolName, email_domain: allowedDomain }).select("id").single();
    if (res.error) throw res.error;
    school = res.data;
  }

  const year = schoolYearOf();
  let { data: sy } = await admin.from("school_years").select("id").eq("school_id", school.id).eq("year", year).maybeSingle();
  if (!sy) {
    const res = await admin.from("school_years").insert({ school_id: school.id, year }).select("id").single();
    if (res.error) throw res.error;
    sy = res.data;
  }
  return { schoolId: school.id as string, schoolYearId: sy.id as string, year };
}

/** 구글·이메일 로그인 직후: 프로필이 없으면 만들기, 교사 목록에 있으면 교사로 */
export async function ensureProfile(user: User) {
  const admin = createAdminClient();
  const email = (user.email ?? "").toLowerCase();
  const teacher = isTeacherEmail(email);
  const { data: existing } = await admin.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
  if (existing) {
    if (teacher && existing.role !== "teacher") await admin.from("profiles").update({ role: "teacher" }).eq("id", user.id);
    return;
  }
  const { schoolId } = await ensureSchoolYear();
  const meta = user.user_metadata as { full_name?: string; name?: string };
  const { error } = await admin.from("profiles").insert({
    id: user.id,
    role: teacher ? "teacher" : "student",
    school_id: schoolId,
    real_name: meta.full_name ?? meta.name ?? null,
    email,
    login_method: "google",
  });
  if (error) throw error;
  if (!teacher) await admin.from("wallets").upsert({ student_id: user.id });
}

async function loadEnrollment(studentId: string): Promise<Enrollment | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("enrollments")
    .select("id, number, class_id, classes!inner(grade, class_no, join_code, school_years!inner(year))")
    .eq("student_id", studentId)
    .eq("classes.school_years.year", schoolYearOf())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const c = data.classes as unknown as { grade: number; class_no: number; join_code: string };
  return { id: data.id, classId: data.class_id, number: data.number, grade: c.grade, classNo: c.class_no, joinCode: c.join_code };
}

/** 로그인 안 했으면 null. 한 요청 안에서는 한 번만 조회 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;

  const admin = createAdminClient();
  const { data: p } = await admin
    .from("profiles")
    .select("role, nickname, real_name, school_id, login_method, email")
    .eq("id", user.id)
    .maybeSingle();
  if (!p) return null;

  return {
    userId: user.id,
    email: p.email ?? user.email ?? "",
    role: p.role,
    nickname: p.nickname,
    realName: p.real_name,
    schoolId: p.school_id,
    loginMethod: p.login_method,
    enrollment: p.role === "student" ? await loadEnrollment(user.id) : null,
  };
});

export async function requireViewer() {
  const v = await getViewer();
  if (!v) redirect("/login");
  return v;
}

/** 학생 화면: 반과 닉네임까지 정해져 있어야 함 */
export async function requireStudent() {
  const v = await requireViewer();
  if (v.role === "teacher") return v; // 교사도 학생 화면을 둘러볼 수 있음
  if (!v.enrollment || !v.nickname) redirect("/onboarding");
  return v;
}

export async function requireTeacher() {
  const v = await requireViewer();
  if (v.role !== "teacher") redirect("/");
  return v;
}
