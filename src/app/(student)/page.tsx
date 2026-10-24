import { ClientOnly } from "@/components/ui/ClientOnly";
import { Loading } from "@/components/ui/Loading";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { HomeDashboard } from "./HomeDashboard";

// 학생 첫 화면. 반 미니룸이 생기면 가운데를 미니룸으로 바꿉니다.
export default function Home() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <ClientOnly fallback={<Loading />}>
          <HomeDashboard />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
