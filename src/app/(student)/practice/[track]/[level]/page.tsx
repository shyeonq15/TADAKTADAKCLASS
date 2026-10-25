import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TRACKS } from "@/config/game";
import { STAGE_COUNT } from "@/lib/practice/stages";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { parseTrackLevel } from "@/lib/practice/params";
import { LevelRound } from "./LevelRound";

export function generateStaticParams() {
  return TRACKS.flatMap((track) => Array.from({ length: STAGE_COUNT }, (_, i) => ({ track, level: String(i + 1) })));
}

async function LevelContent({ params }: { params: PageProps<"/practice/[track]/[level]">["params"] }) {
  const { track, level } = await params;
  const parsed = parseTrackLevel(track, level);
  if (!parsed) notFound();
  return (
    <ClientOnly fallback={<Loading />}>
      <LevelRound track={parsed.track} level={parsed.level.stage} />
    </ClientOnly>
  );
}

export default function LevelPage({ params }: PageProps<"/practice/[track]/[level]">) {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <Suspense fallback={<Loading />}>
          <LevelContent params={params} />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
