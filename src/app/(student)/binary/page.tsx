import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { BinaryLab } from "./BinaryLab";

export default function BinaryPage() {
  return (
    <DesktopBackground>
      <main className="px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">이진수 연습실</h1>
        <ClientOnly fallback={<Loading />}>
          <BinaryLab />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
