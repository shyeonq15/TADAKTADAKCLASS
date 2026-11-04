import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadNotebook, loadVocabRanks, loadVocabWeek } from "@/lib/vocab/server";
import { VocabLab } from "./VocabLab";

async function Content() {
  await connection();
  const v = await requireStudent();
  const [week, notebook, ranks] = await Promise.all([loadVocabWeek(v.userId), loadNotebook(v.userId), loadVocabRanks(v.userId)]);
  return <VocabLab initial={{ week, notebook, ranks }} />;
}

export default function VocabPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">영단어 연구소</h1>
        <Suspense fallback={<Loading text="단어장을 펴는 중..." />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
