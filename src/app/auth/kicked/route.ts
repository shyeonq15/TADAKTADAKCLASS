import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// 다른 PC에서 같은 계정으로 로그인해서 밀려난 PC: 로그아웃하고 안내와 함께 로그인 화면으로
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const res = NextResponse.redirect(new URL("/login?error=kicked", request.nextUrl.origin));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
