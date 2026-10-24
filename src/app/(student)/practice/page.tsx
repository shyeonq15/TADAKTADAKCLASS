import { ClientOnly } from "@/components/ui/ClientOnly";
import { Loading } from "@/components/ui/Loading";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { TrackMap } from "./TrackMap";

export default function PracticePage() {
  return (
    <DesktopBackground>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="title-lime text-center text-title">연습 트랙</h1>
        <ClientOnly fallback={<Loading />}>
          <TrackMap />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
