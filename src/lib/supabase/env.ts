// Supabase 접속 정보. 값은 .env.local 에 넣습니다 (.env.example 참고).
// NEXT_PUBLIC_ 이 붙은 값은 브라우저에도 보이는 공개 키라서 괜찮아요.
// 절대 공개하면 안 되는 secret 키(service_role)는 여기 넣지 않습니다.

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase 환경 변수가 없어요. .env.example 을 복사해 .env.local 을 만들고 값을 넣은 뒤 개발 서버를 다시 켜 주세요.",
    );
  }
  return env;
}
