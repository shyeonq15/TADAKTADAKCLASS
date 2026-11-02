import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadExplore } from "@/lib/explore/server";
import { ExploreView } from "./ExploreView";

async function Content() {
  await connection();
  const v = await requireStudent();
  return <ExploreView data={await loadExplore(v.userId)} />;
}

export default function ExplorePage() {
  return (
    <DesktopBackground>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="text-center">
          <h1 className="title-lime text-title">교과 탐험</h1>
          <p className="mt-1 font-pixel text-body text-navy-900">
            교과서 글을 치면서 오늘 배운 내용을 다시 만나요. 지문마다 별 ★3개를 모아 봐요!
          </p>
        </div>
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
