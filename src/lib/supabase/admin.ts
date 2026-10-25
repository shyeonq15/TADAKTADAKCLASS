import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";

/**
 * 서버 전용 관리자 클라이언트 (secret key). RLS를 건너뛰므로
 * 반드시 서버 코드에서, 권한을 직접 확인한 뒤에만 씁니다.
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error(".env.local 에 SUPABASE_SECRET_KEY 가 없어요.");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
