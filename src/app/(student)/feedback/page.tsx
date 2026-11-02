import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadMyFeedback } from "@/lib/feedback/server";
import { FeedbackBox } from "./FeedbackBox";

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const v = await requireStudent();
  const [mine, sp] = await Promise.all([loadMyFeedback(v.userId), searchParams]);
  const from = typeof sp.from === "string" ? sp.from : "";
  return <FeedbackBox items={mine.items} ready={mine.ready} from={from} />;
}

export default function FeedbackPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <Suspense fallback={<Loading />}>
          <Content searchParams={searchParams} />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
