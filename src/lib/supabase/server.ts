import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseEnv } from "./env";

/** 서버 컴포넌트·서버 함수·라우트 핸들러에서 쓰는 Supabase 클라이언트. 요청마다 새로 만듭니다. */
export async function createClient() {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없어요. 세션 갱신은 proxy.ts 가 맡습니다.
        }
      },
    },
  });
}
