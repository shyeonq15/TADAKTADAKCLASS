"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PACKS } from "@/data/packs";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { usePracticeData } from "@/lib/practice/store";

/** 코드 빈칸 채우기: 핵심 부분이 가려진 코드를 설명을 보고 떠올려 치기 */
export function BlankPractice() {
  const router = useRouter();
  const { progress } = usePracticeData();
  const [level, setLevel] = useState<number | null>(null);
  const open = PACKS.code.levels.filter((l) => l.level <= progress.unlocked.code);

  if (level === null) {
    return (
      <RetroWindow title="빈칸 채우기.exe" className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-4 bg-navy-900 px-6 py-8 text-center">
          <p className="title-lime text-hero">빈칸 채우기</p>
          <MissionLabel keyword="MISSION">가려진 코드를 떠올려서 쳐 봐요</MissionLabel>
          <p className="font-pixel text-small text-sky-100">
            코드 설명을 읽고, ____ 로 가려진 부분에 무엇이 들어갈지 생각하며 쳐요. 다 치면 결과 맞히기 퀴즈도 있어요.
          </p>
          <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
            {open.map((l, i) => (
              <PixelButton key={l.level} variant={l.advanced ? "reward" : "success"} autoFocus={i === open.length - 1} onClick={() => setLevel(l.level)}>
                <span className="flex flex-col leading-tight">
                  레벨 {l.level}
                  <span className="text-small font-normal">{l.title}</span>
                </span>
              </PixelButton>
            ))}
          </div>
        </div>
      </RetroWindow>
    );
  }

  return (
    <RoundRunner
      key={level}
      request={{ kind: "blank", track: "code", level }}
      title={`빈칸 채우기 · 레벨 ${level}`}
      subtitle="가려진 코드를 떠올려서 쳐 봐요"
      actions={(_, retry) => (
        <>
          <PixelButton variant="success" autoFocus onClick={retry}>
            ↻ 한 문제 더
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => setLevel(null)}>
            레벨 바꾸기
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => router.push("/practice")}>
            트랙 맵
          </PixelButton>
        </>
      )}
    />
  );
}
