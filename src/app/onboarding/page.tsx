import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireViewer } from "@/lib/auth/viewer";
import { OnboardingForm } from "./OnboardingForm";

async function Content() {
  const viewer = await requireViewer();
  if (viewer.role === "teacher") redirect("/teacher");
  if (viewer.enrollment && viewer.nickname) redirect("/");
  return (
    <RetroWindow title="처음 왔어요.exe" className="w-full max-w-md">
      <OnboardingForm needsClass={!viewer.enrollment} currentNickname={viewer.nickname ?? ""} />
    </RetroWindow>
  );
}

export default function OnboardingPage() {
  return (
    <DesktopBackground>
      <main className="flex flex-1 items-start justify-center px-4 py-12">
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
