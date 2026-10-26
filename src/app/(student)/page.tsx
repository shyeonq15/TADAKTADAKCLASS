import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadPracticeData } from "@/lib/practice/server";
import { loadMyBattle } from "@/lib/battle/server";
import { BattleBoard } from "@/components/battle/BattleBoard";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { HomeDashboard } from "./HomeDashboard";

/** 처음 온 학생은 배치 테스트부터 (한 번만) */
async function PlacementGate({ children }: { children: React.ReactNode }) {
  await connection(); // 로그인·날짜는 요청마다 새로 확인
  const v = await requireStudent();
  if (v.role === "student" && !(await loadPracticeData(v.userId)).progress.placement) redirect("/placement");
  return children;
}

/** 첫 화면 맨 위: 반 대결 순위 요약 (미니룸은 위쪽 메뉴의 "우리 반" 탭에서) */
async function HomeBattle() {
  const v = await requireStudent();
  const battle = await loadMyBattle(v.userId, v.enrollment);
  if (!battle) return null;
  return (
    <RetroWindow title="반대결_순위판.exe" className="mb-6">
      <BattleBoard data={battle} compact />
      <div className="mt-2 flex flex-wrap gap-2">
        <PixelLink href="/battle" variant="ghost" size="sm">
          반 대결 자세히 보기
        </PixelLink>
        <PixelLink href="/hall" variant="ghost" size="sm">
          🏆 명예의 전당
        </PixelLink>
      </div>
    </RetroWindow>
  );
}

// 학생 첫 화면: 맨 위는 반 대결 요약, 아래는 내 연습 현황
export default function Home() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Suspense fallback={<Loading />}>
          <PlacementGate>
            <HomeBattle />
            <ClientOnly fallback={<Loading />}>
              <HomeDashboard />
            </ClientOnly>
          </PlacementGate>
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
