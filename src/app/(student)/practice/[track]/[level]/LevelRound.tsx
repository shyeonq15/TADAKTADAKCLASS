"use client";

import { useRouter } from "next/navigation";
import { LEVEL_CLEAR, type Track } from "@/config/game";
import { getLevel, MODE_LABELS } from "@/data/packs";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { usePracticeData } from "@/lib/practice/store";

export function LevelRound({ track, level }: { track: Track; level: number }) {
  const router = useRouter();
  const { progress } = usePracticeData();
  const lv = getLevel(track, level)!;

  if (level > progress.unlocked[track]) {
    return (
      <RetroWindow title="잠긴 레벨" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">
          아직 열리지 않은 레벨이에요. 레벨 {progress.unlocked[track]}을 통과하거나 배치 테스트를 하면 열려요.
        </p>
        <div className="mt-4 flex gap-2">
          <PixelLink href={`/practice/${track}/${progress.unlocked[track]}`} size="sm" variant="success">
            레벨 {progress.unlocked[track]} 하러 가기
          </PixelLink>
          <PixelLink href="/practice" size="sm" variant="ghost">
            트랙 맵
          </PixelLink>
        </div>
      </RetroWindow>
    );
  }

  return (
    <RoundRunner
      request={{ kind: "practice", track, level }}
      title={`레벨 ${level} · ${lv.title}`}
      subtitle={`${MODE_LABELS[lv.mode]} · 목표 ${lv.goalCpm}타, 정확도 ${LEVEL_CLEAR.minAccuracy}%`}
      actions={(save, retry) => (
        <>
          <PixelButton variant={save.unlockedLevel ? "ghost" : "success"} autoFocus={!save.unlockedLevel} onClick={retry}>
            ↻ 다시 하기
          </PixelButton>
          {save.unlockedLevel && (
            <PixelButton variant="success" autoFocus onClick={() => router.push(`/practice/${track}/${save.unlockedLevel}`)}>
              다음 레벨 ▶
            </PixelButton>
          )}
          {Object.keys(save.attempt.missedKeys).length > 0 && (
            <PixelButton variant="reward" onClick={() => router.push(`/practice/weak/${track}`)}>
              약한 키 맞춤 연습
            </PixelButton>
          )}
          <PixelButton variant="ghost" onClick={() => router.push("/practice")}>
            트랙 맵
          </PixelButton>
        </>
      )}
    />
  );
}
