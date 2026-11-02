import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { RaidWindow } from "@/components/room/RaidWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { loadRaid } from "@/lib/raid/server";

/** 우리 반 협동 레이드 (전용 화면) */
async function Content() {
  await connection();
  const v = await requireStudent();
  const classId = v.enrollment?.classId;
  if (!classId) {
    return (
      <RetroWindow title="협동 레이드">
        <p className="font-pixel text-body">반에 들어가 있는 학생만 함께할 수 있어요.</p>
      </RetroWindow>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <RaidWindow raid={await loadRaid(classId, v.userId)} />
      <div className="flex flex-wrap justify-center gap-2">
        <PixelLink href="/practice" variant="success">
          ⌨️ 연습해서 공격하기
        </PixelLink>
        <PixelLink href="/games" variant="ghost">
          🎮 게임으로 공격하기
        </PixelLink>
      </div>
    </div>
  );
}

export default function RaidPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">협동 레이드</h1>
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
