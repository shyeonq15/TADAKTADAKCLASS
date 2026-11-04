import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { caseSetOf } from "@/config/cases";
import { CaseQuiz } from "./CaseQuiz";

/** 사례 분류 퀴즈 (선거 원칙 지킴이, 민주주의 원리 찾기 …) */
export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const set = caseSetOf(id);
  return (
    <DesktopBackground quiet>
      <main className="px-4 py-8">
        {set ? (
          <CaseQuiz set={set} backHref="/explore?subject=social" />
        ) : (
          <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
            <p className="font-pixel text-body">이 퀴즈를 찾을 수 없어요.</p>
            <PixelLink href="/explore" size="sm" variant="success" className="mt-4">
              교과 탐험으로
            </PixelLink>
          </RetroWindow>
        )}
      </main>
    </DesktopBackground>
  );
}
