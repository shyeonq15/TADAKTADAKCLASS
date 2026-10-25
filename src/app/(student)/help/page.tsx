import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { HelpTabs } from "./HelpTabs";

export default function HelpPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <h1 className="title-lime text-center text-title">도움말</h1>
        <ClientOnly fallback={<Loading />}>
          <HelpTabs />
        </ClientOnly>
      </main>
    </DesktopBackground>
  );
}
