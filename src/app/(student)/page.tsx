import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadPracticeData } from "@/lib/practice/server";
import { HomeDashboard } from "./HomeDashboard";

/** 처음 온 학생은 배치 테스트부터 (한 번만) */
async function PlacementGate({ children }: { children: React.ReactNode }) {
  const v = await requireStudent();
  if (v.role === "student" && !(await loadPracticeData(v.userId)).progress.placement) redirect("/placement");
  return children;
}

// 학생 첫 화면. 반 미니룸이 생기면 가운데를 미니룸으로 바꿉니다.
export default function Home() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Suspense fallback={<Loading />}>
          <PlacementGate>
            <ClientOnly fallback={<Loading />}>
              <HomeDashboard />
            </ClientOnly>
          </PlacementGate>
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
