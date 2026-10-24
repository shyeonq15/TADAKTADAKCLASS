import { ClientOnly } from "@/components/ui/ClientOnly";
import { Loading } from "@/components/ui/Loading";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { PlacementRun } from "./PlacementRun";

export default function PlacementPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <ClientOnly fallback={<Loading />}>
          <PlacementRun />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
