import type { NextRequest } from "next/server";
import { MINIMI_SLOTS, type MinimiLook } from "@/config/shop";
import { minimiSvg } from "@/components/pixel/minimiSvg";

// 미니미 그림 주소: /api/minimi?fur=fur-sky&hat=hat-crown&v=1
// 모양만 그리는 그림이라 로그인 없이 열려요. 같은 주소는 브라우저·CDN이 오래 기억해요 (그림이 바뀌면 v 를 올림).
export function GET(request: NextRequest) {
  const look: MinimiLook = {};
  for (const slot of MINIMI_SLOTS) {
    const id = request.nextUrl.searchParams.get(slot);
    if (id) look[slot] = id;
  }
  return new Response(minimiSvg(look), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=604800, s-maxage=31536000, immutable",
    },
  });
}
