import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/** 로그인 없이 열 수 있는 주소 */
const PUBLIC_PATHS = ["/login", "/auth", "/api/health", "/api/minimi", "/themes", "/privacy", "/check"];

/** 요청마다 로그인 세션을 갱신하고, 바뀐 쿠키를 응답에 실어 보냅니다. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const env = getSupabaseEnv();
  if (!env) return response; // 아직 .env.local 이 없으면 그냥 통과

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // 세션 확인·갱신. 이 줄과 createServerClient 사이에 다른 코드를 넣지 마세요.
  const { data } = await supabase.auth.getClaims();

  // 로그인 안 한 사람은 로그인 화면으로 (실제 권한 확인은 각 화면·서버 함수에서 다시 함)
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  return response;
}
