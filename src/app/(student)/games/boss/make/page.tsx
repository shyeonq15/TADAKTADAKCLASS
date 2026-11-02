import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { Loading } from "@/components/ui/Loading";
import { MakeBoss } from "./MakeBoss";

export default function MakeBossPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-6">
        <ClientOnly fallback={<Loading />}>
          <MakeBoss />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
