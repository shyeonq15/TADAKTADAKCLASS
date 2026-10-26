import { connection } from "next/server";
import { Suspense } from "react";
import { BattleBoard } from "@/components/battle/BattleBoard";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { loadMyBattle } from "@/lib/battle/server";

async function Content() {
  await connection();
  const v = await requireStudent();
  const data = await loadMyBattle(v.userId, v.enrollment?.classId ?? null);
  return (
    <RetroWindow title="반대결_순위판.exe">
      {data ? (
        <BattleBoard data={data} />
      ) : (
        <p className="font-pixel text-body">반에 들어가 있는 학생만 볼 수 있어요. 선생님은 교사 화면에서 볼 수 있어요.</p>
      )}
      <div className="mt-4 flex justify-center">
        <PixelLink href="/mission" variant="success">
          오늘의 미션으로 반 점수 올리기
        </PixelLink>
      </div>
    </RetroWindow>
  );
}

export default function BattlePage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="title-lime mb-6 text-center text-title">반 대결</h1>
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
