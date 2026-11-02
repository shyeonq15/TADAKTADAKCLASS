import "server-only";

// 한 계정은 한 PC에서만: 학생이 로그인할 때마다 새 "자리 표"(session_key)를 만들어 이 브라우저 쿠키와 프로필에 같이 적어요.
// 다른 PC에서 같은 계정으로 로그인하면 프로필의 자리 표가 바뀌어서, 먼저 있던 PC는 다음 화면을 열 때 로그아웃돼요.
// 그래서 친구에게 비밀번호를 알려 주고 동시에 대신 치게 할 수 없어요. 로그인 기록은 선생님 화면에서 볼 수 있어요.

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const SESSION_COOKIE = "tadak_sk";
/** 브라우저(PC)마다 정해지는 짧은 표시. 로그인 기록에서 "같은 PC인지" 볼 때 써요 */
export const DEVICE_COOKIE = "tadak_dev";

const DEVICE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newDevice = () => Array.from(randomBytes(5), (b) => DEVICE_CHARS[b % DEVICE_CHARS.length]).join("");

/** 표나 칸이 아직 없을 때 (선생님이 SQL 을 아직 실행하지 않음) */
const missing = (e: { code?: string } | null) => !!e && ["42P01", "PGRST205", "42703", "PGRST204"].includes(e.code ?? "");

/** 학생 로그인 성공 직후: 새 자리 표를 적고, 로그인 기록을 남겨요 */
export async function startStudentSession(studentId: string) {
  const jar = await cookies();
  const key = randomBytes(18).toString("base64url");
  const device = jar.get(DEVICE_COOKIE)?.value || newDevice();
  const opts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
  jar.set(DEVICE_COOKIE, device, { ...opts, maxAge: 60 * 60 * 24 * 400 });
  jar.set(SESSION_COOKIE, key, { ...opts, maxAge: 60 * 60 * 24 * 30 });

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim().slice(0, 64) || null;
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ session_key: key }).eq("id", studentId);
  if (missing(error)) return; // 아직 SQL 전: 예전처럼 동작
  await admin.from("login_events").insert({ student_id: studentId, device, ip });
}

/** 이 브라우저의 자리 표가 프로필의 것과 같은지. 프로필에 자리 표가 없으면(예전 로그인·SQL 전) 통과 */
export async function sessionMatches(profileKey: string | null | undefined) {
  if (!profileKey) return true;
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value === profileKey;
}
