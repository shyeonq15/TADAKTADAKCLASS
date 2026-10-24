import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

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
  await supabase.auth.getClaims();

  return response;
}
