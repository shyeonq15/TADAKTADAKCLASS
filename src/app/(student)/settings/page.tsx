import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { SettingsPanel } from "./SettingsPanel";

export default function SettingsPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        <h1 className="title-lime mb-4 text-center text-title">설정</h1>
        <ClientOnly fallback={<Loading />}>
          <SettingsPanel />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
