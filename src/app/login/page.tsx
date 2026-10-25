import { Suspense } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { FOLDER, HEART, THUMBS } from "@/components/pixel/sprites";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { LoginForms } from "./LoginForms";

export default function LoginPage() {
  return (
    <DesktopBackground>
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 items-start justify-center px-4 py-12">
        {/* 바탕화면 아이콘 (장식) */}
        <div aria-hidden className="absolute left-6 top-10 hidden flex-col items-center gap-1 md:flex">
          <PixelSprite sprite={HEART} scale={5} />
          <span className="border-2 border-navy-900 bg-paper px-2 font-pixel text-small">우리 반</span>
        </div>
        <div aria-hidden className="absolute bottom-16 left-10 hidden flex-col items-center gap-1 md:flex">
          <PixelSprite sprite={FOLDER} scale={6} />
          <span className="border-2 border-navy-900 bg-paper px-2 font-pixel text-small">연습팩</span>
        </div>
        <div aria-hidden className="absolute bottom-20 right-8 hidden flex-col items-center gap-1 md:flex">
          <PixelSprite sprite={THUMBS} scale={6} />
          <span className="border-2 border-navy-900 bg-paper px-2 font-pixel text-small">반 대결</span>
        </div>

        <RetroWindow title="타닥타닥우리반.exe" className="w-full max-w-lg">
          <div className="bg-cream px-6 py-6 text-center">
            <p className="pixel-corners mx-auto mb-3 w-fit bg-lime-200 px-5 py-1 font-title text-body text-lime-800">
              1학년 모여라
            </p>
            <h1 className="title-lime text-[40px] leading-tight">타닥타닥 우리반에</h1>
            <p className="font-title text-heading text-navy-900">놀러오세요..</p>
          </div>
          <Suspense>
            <LoginForms showGoogle={process.env.ENABLE_GOOGLE_LOGIN === "true"} />
          </Suspense>
        </RetroWindow>
      </main>
    </DesktopBackground>
  );
}
