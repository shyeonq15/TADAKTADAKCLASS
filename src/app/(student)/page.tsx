import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadPracticeData } from "@/lib/practice/server";
import { loadRoom } from "@/lib/room/server";
import { loadMyBattle } from "@/lib/battle/server";
import { BattleBoard } from "@/components/battle/BattleBoard";
import { ClassRoom } from "@/components/room/ClassRoom";
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

/** 첫 화면 맨 위: 우리 반 미니룸 (반 친구 미니미 + 반 지갑으로 산 가구) */
async function HomeRoom() {
  const v = await requireStudent();
  const who = { userId: v.userId, classId: v.enrollment?.classId ?? null };
  const [room, battle] = await Promise.all([loadRoom(who), loadMyBattle(who.userId, who.classId)]);
  if (!room) return null;
  const done = room.members.filter((m) => m.doneToday).length;
  return (
    <RetroWindow title="우리반_미니룸.exe" className="mb-6">
      <ClassRoom wall={room.wall} floor={room.floor} furniture={room.furniture} members={room.members} meId={room.meId} />
      <div className="mt-3 flex flex-wrap items-center gap-3 font-pixel text-body text-navy-900">
        <span>
          오늘 미션 완료 <strong className="font-title text-heading">{done}</strong> / {room.members.length}명 ✨
        </span>
        <span>
          반 지갑 <strong className="font-title text-heading">{room.classCoins}</strong>코인
        </span>
        {room.proposals.length > 0 && <span className="font-bold text-navy-700">투표 중인 가구 {room.proposals.length}개!</span>}
        <PixelLink href="/room" variant="reward" size="sm" className="ml-auto">
          미니룸 꾸미기 투표
        </PixelLink>
      </div>
      {battle && (
        <div className="mt-4 border-t-2 border-win-shadow pt-3">
          <BattleBoard data={battle} compact />
          <div className="mt-2 flex flex-wrap gap-2">
            <PixelLink href="/battle" variant="ghost" size="sm">
              반 대결 자세히 보기
            </PixelLink>
            <PixelLink href="/hall" variant="ghost" size="sm">
              🏆 명예의 전당
            </PixelLink>
          </div>
        </div>
      )}
    </RetroWindow>
  );
}

// 학생 첫 화면: 맨 위는 반 미니룸, 아래는 내 연습 현황
export default function Home() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Suspense fallback={<Loading />}>
          <PlacementGate>
            <HomeRoom />
            <ClientOnly fallback={<Loading />}>
              <HomeDashboard />
            </ClientOnly>
          </PlacementGate>
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
