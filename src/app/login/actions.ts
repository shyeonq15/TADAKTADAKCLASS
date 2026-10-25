"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { authConfig, isTeacherEmail, schoolYearOf } from "@/lib/auth/config";
import { requestOrigin } from "@/lib/auth/origin";
import { isValidSecret, parseStudentNo } from "@/lib/auth/pictures";
import { PIN_LOCK, pinPassword } from "@/lib/auth/pin";
import { ensureProfile } from "@/lib/auth/viewer";

export type FormState = { ok: boolean; message: string } | null;

/** 학교 구글 계정으로 로그인 → 구글 → /auth/callback (지금은 꺼 둠: ENABLE_GOOGLE_LOGIN=true 로 켬) */
/** Supabase에서 구글 로그인이 켜져 있는지 */
async function googleEnabled() {
  const { url, key } = requireSupabaseEnv();
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return !!settings.external?.google;
  } catch {
    return false;
  }
}

export async function signInWithGoogle() {
  if (process.env.ENABLE_GOOGLE_LOGIN !== "true") redirect("/login?error=google-off");
  if (!(await googleEnabled())) redirect("/login?error=google-off");
  const supabase = await createClient();
  const { allowedDomain } = authConfig();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await requestOrigin()}/auth/callback`,
      // hd: 구글 로그인 화면에서 학교 계정을 먼저 보여 줌 (실제 차단은 callback에서 다시 확인)
      queryParams: { hd: allowedDomain, prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

/** 교사: 이메일 + 비밀번호 (계정은 터미널에서 npm run teacher:create 로 만듦) */
export async function teacherLogin(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fail = { ok: false, message: "이메일이나 비밀번호가 맞지 않아요." };
  if (!isTeacherEmail(email) || !password) return fail;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return fail;
  await ensureProfile(data.user);
  redirect("/teacher");
}

/* ───────── 학생: 학번 + 그림 비밀번호 ───────── */

type StudentRow = { enrollmentId: string; studentId: string; email: string; secretSet: boolean; setupOpen: boolean };

/** 학번으로 이번 학년도 학생 찾기 */
async function findStudent(studentNo: string): Promise<StudentRow | null> {
  const parsed = parseStudentNo(studentNo);
  if (!parsed) return null;
  const { data } = await createAdminClient()
    .from("enrollments")
    .select("id, student_id, classes!inner(grade, class_no, allow_secret_setup, school_years!inner(year)), profiles!inner(email, secret_set, login_method)")
    .eq("classes.grade", parsed.grade)
    .eq("classes.class_no", parsed.classNo)
    .eq("classes.school_years.year", schoolYearOf())
    .eq("number", parsed.number)
    .maybeSingle();
  const p = data?.profiles as unknown as { email: string; secret_set: boolean; login_method: string } | undefined;
  const c = data?.classes as unknown as { allow_secret_setup: boolean } | undefined;
  if (!data || !p || p.login_method !== "pin") return null;
  return { enrollmentId: data.id, studentId: data.student_id, email: p.email, secretSet: p.secret_set, setupOpen: !!c?.allow_secret_setup };
}

export type LookupState =
  | { step: "login" | "setup" | "closed"; studentNo: string; label: string }
  | { step: "notfound"; message: string }
  | null;

/** 1단계: 학번 확인 → 로그인 / 처음 설정 / 설정 닫힘 */
export async function lookupStudent(_: LookupState, formData: FormData): Promise<LookupState> {
  const studentNo = String(formData.get("studentNo") ?? "").trim();
  const parsed = parseStudentNo(studentNo);
  if (!parsed) return { step: "notfound", message: "학번은 숫자 5자리로 써 주세요. 예: 1학년 3반 7번 → 10307" };
  const s = await findStudent(studentNo);
  if (!s) return { step: "notfound", message: "그 학번은 아직 등록되지 않았어요. 선생님께 말씀해 주세요." };
  const label = `${parsed.grade}학년 ${parsed.classNo}반 ${parsed.number}번`;
  if (s.secretSet) return { step: "login", studentNo, label };
  return { step: s.setupOpen ? "setup" : "closed", studentNo, label };
}

async function lockedOut(enrollmentId: string) {
  const since = new Date(Date.now() - PIN_LOCK.windowMinutes * 60000).toISOString();
  const { count } = await createAdminClient()
    .from("pin_failures")
    .select("*", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId)
    .gte("failed_at", since);
  return (count ?? 0) >= PIN_LOCK.maxFailures;
}

/** 2단계: 그림 비밀번호로 로그인 */
export async function pictureLogin(_: FormState, formData: FormData): Promise<FormState> {
  const studentNo = String(formData.get("studentNo") ?? "");
  const secret = String(formData.get("secret") ?? "");
  const fail = { ok: false, message: "그림 비밀번호가 달라요. 다시 골라 볼까요?" };
  if (!isValidSecret(secret)) return fail;
  const s = await findStudent(studentNo);
  if (!s || !s.secretSet) return fail;

  if (await lockedOut(s.enrollmentId)) {
    return { ok: false, message: `여러 번 틀려서 ${PIN_LOCK.windowMinutes}분 동안 잠겼어요. 선생님께 말씀해 주세요.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: s.email, password: pinPassword(s.studentId, secret) });
  const admin = createAdminClient();
  if (error) {
    await admin.from("pin_failures").insert({ enrollment_id: s.enrollmentId });
    return fail;
  }
  await admin.from("pin_failures").delete().eq("enrollment_id", s.enrollmentId);
  redirect("/");
}

/** 처음 왔을 때: 그림 비밀번호 정하기 (선생님이 허용을 켠 반만) */
export async function setupPicture(_: FormState, formData: FormData): Promise<FormState> {
  const studentNo = String(formData.get("studentNo") ?? "");
  const secret = String(formData.get("secret") ?? "");
  if (!isValidSecret(secret)) return { ok: false, message: "그림 4개를 골라 주세요." };
  const s = await findStudent(studentNo);
  if (!s) return { ok: false, message: "학번을 다시 확인해 주세요." };
  if (s.secretSet) return { ok: false, message: "이미 비밀번호를 정했어요. 로그인해 주세요." };
  if (!s.setupOpen) return { ok: false, message: "지금은 비밀번호를 정할 수 없어요. 선생님께 말씀해 주세요." };

  const admin = createAdminClient();
  const password = pinPassword(s.studentId, secret);
  const upd = await admin.auth.admin.updateUserById(s.studentId, { password });
  if (upd.error) return { ok: false, message: "저장하지 못했어요. 다시 해 주세요." };
  await admin.from("profiles").update({ secret_set: true }).eq("id", s.studentId);

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: s.email, password });
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
