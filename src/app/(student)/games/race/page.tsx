import { connection } from "next/server";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { loadPracticeData } from "@/lib/practice/server";
import { allTiers, profileTier } from "@/lib/scoring/tier";
import { RaceGame } from "./RaceGame";

async function Content() {
  await connection();
  const v = await requireStudent();
  if (!v.enrollment) {
    return (
      <RetroWindow title="친구 대결" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">친구 대결은 반에 들어가 있는 학생만 할 수 있어요.</p>
      </RetroWindow>
    );
  }
  const data = await loadPracticeData(v.userId);
  const me = {
    userId: v.userId,
    nickname: v.nickname ?? "친구",
    classId: v.enrollment.classId,
    tier: profileTier(allTiers(data.progress.unlocked)),
  };
  return (
    <ClientOnly fallback={<Loading />}>
      <RaceGame me={me} />
    </ClientOnly>
  );
}

export default function RacePage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-6">
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
