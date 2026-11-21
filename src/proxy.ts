import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    {
      // 정적 파일·이미지·폰트에는 돌리지 않음
      source: "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
      // 링크 미리 받기(prefetch)에도 돌리지 않음: 위쪽 메뉴 링크 13개를 화면마다 미리 받으면서
      // 로그인 확인이 한 화면에 10번 넘게 돌아 버셀 CPU 를 많이 썼어요. 미리 받는 건 개인 정보가 없는
      // 화면 뼈대뿐이고, 실제로 그 화면에 들어갈 때는 로그인 확인이 다시 돌아요.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
