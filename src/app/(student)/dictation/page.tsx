import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { Dictation } from "./Dictation";

export default function DictationPage() {
  return (
    <DesktopBackground>
      <main className="px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">영어 받아쓰기</h1>
        <ClientOnly fallback={<Loading />}>
          <Dictation />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
