"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { authConfig, isTeacherEmail, schoolYearOf } from "@/lib/auth/config";
import { requestOrigin } from "@/lib/auth/origin";
import { isPin, PIN_LOCK, pinPassword } from "@/lib/auth/pin";
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

/** 학생: 반 코드 + 번호 + PIN */
export async function pinLogin(_: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const number = Number(formData.get("number"));
  const pin = String(formData.get("pin") ?? "").trim();
  const fail = { ok: false, message: "반 코드, 번호, PIN을 다시 확인해 주세요." };
  if (!code || !Number.isInteger(number) || !isPin(pin)) return fail;

  const admin = createAdminClient();
  const { data: enr } = await admin
    .from("enrollments")
    .select("id, student_id, classes!inner(join_code, school_years!inner(year)), profiles!inner(login_method, email)")
    .eq("classes.join_code", code)
    .eq("classes.school_years.year", schoolYearOf())
    .eq("number", number)
    .maybeSingle();
  const profile = enr?.profiles as unknown as { login_method: string; email: string } | undefined;
  if (!enr || profile?.login_method !== "pin") return fail;

  // 연속 실패 잠금
  const since = new Date(Date.now() - PIN_LOCK.windowMinutes * 60000).toISOString();
  const { count } = await admin
    .from("pin_failures")
    .select("*", { count: "exact", head: true })
    .eq("enrollment_id", enr.id)
    .gte("failed_at", since);
  if ((count ?? 0) >= PIN_LOCK.maxFailures) {
    return { ok: false, message: `PIN을 여러 번 틀려서 ${PIN_LOCK.windowMinutes}분 동안 잠겼어요. 선생님께 말씀해 주세요.` };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: pinPassword(enr.student_id, pin),
  });
  if (error) {
    await admin.from("pin_failures").insert({ enrollment_id: enr.id });
    return fail;
  }
  await admin.from("pin_failures").delete().eq("enrollment_id", enr.id);
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
