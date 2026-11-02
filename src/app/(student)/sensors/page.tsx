import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { SensorQuiz } from "./SensorQuiz";

export default function SensorsPage() {
  return (
    <DesktopBackground>
      <main className="px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">센서·액추에이터 분류</h1>
        <ClientOnly fallback={<Loading />}>
          <SensorQuiz />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
