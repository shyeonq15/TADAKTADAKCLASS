import { ClientOnly } from "@/components/ui/ClientOnly";
import { Loading } from "@/components/ui/Loading";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { MissionRun } from "./MissionRun";

export default function MissionPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <ClientOnly fallback={<Loading />}>
          <MissionRun />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
