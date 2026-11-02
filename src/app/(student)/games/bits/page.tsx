import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { BitsGame } from "./BitsGame";

export default function BitsPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-6">
        <ClientOnly fallback={<Loading />}>
          <BitsGame />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
