import { Suspense } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { PackRound } from "./PackRound";

async function Content({ params }: { params: PageProps<"/practice/pack/[id]">["params"] }) {
  const { id } = await params;
  return (
    <ClientOnly fallback={<Loading />}>
      <PackRound packId={id} />
    </ClientOnly>
  );
}

export default function PackPage({ params }: PageProps<"/practice/pack/[id]">) {
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
