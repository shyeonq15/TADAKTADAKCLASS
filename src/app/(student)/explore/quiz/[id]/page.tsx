import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireStudent } from "@/lib/auth/viewer";
import { loadConceptQuiz } from "@/lib/explore/server";
import { ConceptQuizPlay } from "./ConceptQuizPlay";

/** 교과 탐험 단원의 개념 빈칸 퀴즈 (지문의 [대괄호] 낱말이 빈칸) */
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const v = await requireStudent();
  const { id } = await params;
  const quiz = await loadConceptQuiz(v.userId, id);
  if (quiz) return <ConceptQuizPlay quiz={quiz} />;
  return (
    <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
      <p className="font-pixel text-body">이 단원에는 퀴즈가 없어요.</p>
      <PixelLink href="/explore" size="sm" variant="success" className="mt-4">
        교과 탐험으로
      </PixelLink>
    </RetroWindow>
  );
}

export default function ConceptQuizPage({ params }: { params: Promise<{ id: string }> }) {
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
