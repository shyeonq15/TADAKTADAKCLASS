import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LESSON_COUNT } from "@/data/codeNotes";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { LessonRound } from "./LessonRound";

export function generateStaticParams() {
  return Array.from({ length: LESSON_COUNT }, (_, i) => ({ n: String(i + 1) }));
}

async function Content({ params }: { params: PageProps<"/learn/[n]">["params"] }) {
  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1 || n > LESSON_COUNT) notFound();
  return (
    <ClientOnly fallback={<Loading />}>
      <LessonRound n={n} />
    </ClientOnly>
  );
}

export default function LessonPage({ params }: PageProps<"/learn/[n]">) {
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
