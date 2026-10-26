import type { NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/viewer";
import { saveGame, type GameSubmission } from "@/lib/games/server";

// 혼자 하는 게임(단어 비·토끼 달리기) 중에 화면을 떠나면, 그때까지의 기록으로 판을 끝내고 저장해요.
// 화면이 sendBeacon 으로 보내요 (점수는 서버가 다시 계산하고, 같은 판은 한 번만 저장돼요)
export async function POST(request: NextRequest) {
  const v = await getViewer();
  if (!v) return new Response(null, { status: 401 });
  let sub: GameSubmission;
  try {
    sub = (await request.json()) as GameSubmission;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof sub?.token !== "string") return new Response(null, { status: 400 });
  const res = await saveGame({ userId: v.userId, classId: v.enrollment?.classId ?? null }, {
    token: sub.token,
    events: Array.isArray(sub.events) ? sub.events : [],
    durationMs: Number(sub.durationMs) || 0,
    keyTimes: Array.isArray(sub.keyTimes) ? sub.keyTimes : [],
  });
  return new Response(null, { status: "error" in res ? 409 : 204 });
}
