import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TRACKS } from "@/config/game";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { isTrack } from "@/lib/practice/params";
import { WeakRound } from "./WeakRound";

export function generateStaticParams() {
  return TRACKS.map((track) => ({ track }));
}

async function WeakContent({ params }: { params: PageProps<"/practice/weak/[track]">["params"] }) {
  const { track } = await params;
  if (!isTrack(track)) notFound();
  return (
    <ClientOnly fallback={<Loading />}>
      <WeakRound track={track} />
    </ClientOnly>
  );
}

export default function WeakPage({ params }: PageProps<"/practice/weak/[track]">) {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <Suspense fallback={<Loading />}>
          <WeakContent params={params} />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
