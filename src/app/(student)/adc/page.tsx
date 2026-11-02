import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { AdcLab } from "./AdcLab";

export default function AdcPage() {
  return (
    <DesktopBackground>
      <main className="px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">아날로그 → 디지털</h1>
        <ClientOnly fallback={<Loading />}>
          <AdcLab />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
