import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { BlankPractice } from "./BlankPractice";

export default function BlankPage() {
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        <ClientOnly fallback={<Loading />}>
          <BlankPractice />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
