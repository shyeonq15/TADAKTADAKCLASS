import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { RainGame } from "./RainGame";

export default function RainPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-6">
        <ClientOnly fallback={<Loading />}>
          <RainGame />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
