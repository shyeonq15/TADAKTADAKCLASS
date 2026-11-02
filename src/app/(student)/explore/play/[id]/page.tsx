import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { loadExplore } from "@/lib/explore/server";
import { ExploreRound } from "./ExploreRound";

/** 교과 탐험 지문 한 판 */
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const v = await requireStudent();
  const { id } = await params;
  const data = await loadExplore(v.userId);
  for (const s of data.subjects) {
    for (const u of s.units) {
      const i = u.passages.findIndex((p) => p.id === id);
      if (i < 0) continue;
      return (
        <ExploreRound
          key={id}
          passageId={id}
          track={s.track}
          title={`${s.icon} ${s.label} · ${u.unitNo ? `${u.unitNo}단원 ` : ""}${u.title}`}
          subtitle={`지문 ${i + 1} / ${u.passages.length}`}
          nextId={u.passages[i + 1]?.id ?? null}
          subjectId={s.id}
        />
      );
    }
  }
  return (
    <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
      <p className="font-pixel text-body">이 지문을 찾을 수 없어요.</p>
      <PixelLink href="/explore" size="sm" variant="success" className="mt-4">
        교과 탐험으로
      </PixelLink>
    </RetroWindow>
  );
}

export default function ExplorePlayPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <Suspense fallback={<Loading />}>
          <Content params={params} />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
