import "server-only";
import { headers } from "next/headers";

/** 지금 접속한 주소 (localhost, Netlify, Vercel 어디서든 로그인 후 같은 곳으로 돌아오게) */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
