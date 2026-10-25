import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { LessonList } from "./LessonList";

export default function LearnPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="text-center">
          <h1 className="title-lime text-title">파이썬 첫걸음</h1>
          <p className="mt-1 font-pixel text-body text-navy-900">print부터 함수까지, 한 강씩 읽고 → 따라 치고 → 결과를 맞혀 봐요</p>
        </div>
        <ClientOnly fallback={<Loading />}>
          <LessonList />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
