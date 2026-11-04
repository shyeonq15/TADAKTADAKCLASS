"use client";

import { useRouter } from "next/navigation";
import type { Track } from "@/config/game";
import { PixelButton } from "@/components/ui/PixelButton";
import { RoundRunner } from "@/components/typing/RoundRunner";

/** 교과 탐험 지문 한 판 + 결과에서 다음 지문으로 */
export function ExploreRound({
  passageId,
  track,
  title,
  subtitle,
  nextId,
  subjectId,
  context,
}: {
  passageId: string;
  track: Track;
  title: string;
  subtitle: string;
  nextId: string | null;
  subjectId: string;
  /** 이어 읽기: 앞뒤 지문 */
  context?: { before: string[]; after: string[]; step?: { n: number; total: number } };
}) {
  const router = useRouter();
  return (
    <RoundRunner
      autoStart
      context={context}
      request={{ kind: "subject", track, passageId }}
      title={title}
      subtitle={subtitle}
      actions={(save, retry) => {
        const passed = (save.subjectStars ?? 0) > 0;
        return (
          <>
            {nextId && (
              <PixelButton variant={passed ? "success" : "ghost"} autoFocus={passed} onClick={() => router.push(`/explore/play/${nextId}`)}>
                다음 지문 ▶
              </PixelButton>
            )}
            <PixelButton variant={passed && nextId ? "ghost" : "success"} autoFocus={!passed || !nextId} onClick={retry}>
              ↻ 다시 하기 (별 더 모으기)
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => router.push(`/explore?subject=${subjectId}`)}>
              단원 지도
            </PixelButton>
          </>
        );
      }}
    />
  );
}
