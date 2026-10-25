import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/auth/config";
import { ensureProfile } from "@/lib/auth/viewer";

// 구글 로그인·교사 메일 링크가 돌아오는 곳: 학교 계정인지 확인하고 프로필을 만듭니다.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const back = (error: string) => NextResponse.redirect(new URL(`/login?error=${error}`, url.origin));
  if (!code) return back("link");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back("link");

  if (!isAllowedEmail(data.user.email ?? "")) {
    await supabase.auth.signOut();
    // 학교 밖 계정은 기록을 남기지 않음 (개인정보 최소화)
    await createAdminClient().auth.admin.deleteUser(data.user.id);
    return back("domain");
  }

  await ensureProfile(data.user);
  return NextResponse.redirect(new URL("/", url.origin));
}
