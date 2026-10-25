"use client";

import { useRouter } from "next/navigation";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { usePracticeData } from "@/lib/practice/store";

/** 선생님이 우리 반에 배포한 연습팩 연습 */
export function PackRound({ packId }: { packId: string }) {
  const router = useRouter();
  const { packs } = usePracticeData();
  const pack = packs.find((p) => p.id === packId);

  if (!pack) {
    return (
      <RetroWindow title="연습팩" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">이 연습팩은 우리 반에 배포되지 않았어요.</p>
        <PixelLink href="/practice" size="sm" variant="ghost" className="mt-4">
          트랙 맵
        </PixelLink>
      </RetroWindow>
    );
  }

  return (
    <RoundRunner
      request={{ kind: "pack", track: pack.track, packId }}
      title={`선생님 연습 · ${pack.title}`}
      subtitle={`선생님이 고른 글 · ${pack.rounds}판 중 하나가 나와요`}
      actions={(_, retry) => (
        <>
          <PixelButton variant="success" autoFocus onClick={retry}>
            ↻ 다른 판 하기
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => router.push("/practice")}>
            트랙 맵
          </PixelButton>
        </>
      )}
    />
  );
}
