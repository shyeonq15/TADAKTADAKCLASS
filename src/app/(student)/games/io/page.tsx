import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { IoGame } from "./IoGame";

export default function IoPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-6">
        <ClientOnly fallback={<Loading />}>
          <IoGame />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
