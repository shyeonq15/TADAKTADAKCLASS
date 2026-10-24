import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 정적 파일·이미지·폰트에는 돌리지 않음
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|.*\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
