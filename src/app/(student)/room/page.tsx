import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { loadRoom } from "@/lib/room/server";
import { loadClassNews } from "@/lib/room/news";
import { loadClassGallery } from "@/lib/pixel/server";
import { PixelGallery } from "./PixelGallery";
import Link from "next/link";
import { RoomScreen } from "./RoomScreen";

async function Content() {
  await connection();
  const v = await requireStudent();
  const classId = v.enrollment?.classId ?? null;
  const [room, news, arts] = await Promise.all([
    loadRoom({ userId: v.userId, classId }),
    classId ? loadClassNews(classId) : [],
    classId ? loadClassGallery(classId, v.userId) : [],
  ]);
  if (!room) {
    return (
      <RetroWindow title="우리 반 미니룸">
        <p className="font-pixel text-body">반에 들어가 있는 학생만 미니룸을 볼 수 있어요. 선생님은 교사 화면에서 반별로 볼 수 있어요.</p>
      </RetroWindow>
    );
  }
  return (
    <>
      <RoomScreen initial={room} />
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_280px]">
        <RetroWindow title="📢 우리 반 소식">
          {news.length === 0 ? (
            <p className="font-pixel text-body text-text-muted">이번 주 소식이 아직 없어요. 첫 소식의 주인공이 되어 봐요!</p>
          ) : (
            <ul className="flex flex-col font-pixel text-body text-navy-900">
              {news.map((n, i) => (
                <li key={i} className="flex items-start gap-2 border-b border-win-shadow py-1.5">
                  <span className="w-6 shrink-0 text-center">{n.icon}</span>
                  <span className="min-w-0 flex-1">{n.text}</span>
                  <span className="shrink-0 text-small text-text-muted">
                    {new Date(n.at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 font-pixel text-small text-text-muted">최근 7일 동안 우리 반 친구들이 해낸 일이에요. 축하해 줘요! 👏</p>
        </RetroWindow>
        <RetroWindow title="친구 미니홈피">
          <ul className="flex flex-wrap gap-1 font-pixel text-small">
            {room.members.map((m) => (
              <li key={m.id}>
                <Link
                  href={m.id === v.userId ? "/profile" : `/profile/${m.id}`}
                  className={`inline-block border-2 border-navy-900 px-2 py-0.5 hover:bg-sky-100 ${m.id === v.userId ? "bg-lime-400 font-bold" : "bg-paper"}`}
                >
                  {m.nickname}
                </Link>
              </li>
            ))}
          </ul>
        </RetroWindow>
      </div>
      <div className="mt-5">
        <PixelGallery arts={arts} />
      </div>
    </>
  );
}

export default function RoomPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="title-lime mb-6 text-center text-title">우리 반 미니룸</h1>
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
