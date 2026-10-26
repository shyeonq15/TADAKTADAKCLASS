import type { Metadata } from "next";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { CheckRunner } from "./CheckRunner";

export const metadata: Metadata = { title: "접속 점검 · 타닥타닥 우리반" };

// PC실 점검용 (로그인 없이 열림). CLAUDE.md 6장: 학교 PC실에서 웹소켓이 막히는지 초기에 확인
export default function CheckPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <RetroWindow title="접속점검.exe">
          <CheckRunner />
        </RetroWindow>
      </main>
    </DesktopBackground>
  );
}
