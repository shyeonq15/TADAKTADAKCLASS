import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { loadRoom } from "@/lib/room/server";
import { RoomScreen } from "./RoomScreen";

async function Content() {
  await connection();
  const v = await requireStudent();
  const room = await loadRoom({ userId: v.userId, classId: v.enrollment?.classId ?? null });
  if (!room) {
    return (
      <RetroWindow title="우리 반 미니룸">
        <p className="font-pixel text-body">반에 들어가 있는 학생만 미니룸을 볼 수 있어요. 선생님은 교사 화면에서 반별로 볼 수 있어요.</p>
      </RetroWindow>
    );
  }
  return <RoomScreen initial={room} />;
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
