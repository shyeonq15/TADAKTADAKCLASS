import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { RunnerGame } from "./RunnerGame";

export default function RunnerPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-6">
        <ClientOnly fallback={<Loading />}>
          <RunnerGame />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
