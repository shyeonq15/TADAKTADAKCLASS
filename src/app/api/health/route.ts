import { connection } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

// 연결 확인용: http://localhost:3000/api/health
// 테이블 없이 Supabase 인증 설정만 읽어서 URL·키가 맞는지, 구글 로그인이 켜졌는지 알려 줍니다.
export async function GET() {
  await connection();

  const env = getSupabaseEnv();
  if (!env) {
    return Response.json({ ok: false, step: "env", message: ".env.local 에 Supabase 값이 없어요." }, { status: 500 });
  }

  try {
    const res = await fetch(`${env.url}/auth/v1/settings`, { headers: { apikey: env.key } });
    if (!res.ok) {
      return Response.json(
        { ok: false, step: "key", status: res.status, message: "Supabase에 닿았지만 키가 맞지 않아요." },
        { status: 502 },
      );
    }
    const settings = (await res.json()) as { external?: Record<string, boolean> };
    return Response.json({
      ok: true,
      message: "Supabase에 연결됐어요!",
      googleLogin: settings.external?.google ? "켜짐" : "아직 꺼짐",
    });
  } catch {
    return Response.json(
      { ok: false, step: "url", message: "Supabase 주소에 닿지 않아요. URL을 확인해 주세요." },
      { status: 502 },
    );
  }
}
