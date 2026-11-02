import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { PixelStudio } from "./PixelStudio";

export default function PixelPage() {
  return (
    <DesktopBackground>
      <main className="px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">0과 1 픽셀 아트</h1>
        <ClientOnly fallback={<Loading />}>
          <PixelStudio />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
