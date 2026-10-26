"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Track } from "@/config/game";
import { lessonTitle } from "@/data/codeNotes";
import { MODE_LABELS } from "@/data/packs";
import { getStage, stageName } from "@/lib/practice/stages";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { usePracticeData } from "@/lib/practice/store";

export function LevelRound({ track, level }: { track: Track; level: number }) {
  const router = useRouter();
  const { progress } = usePracticeData();
  const st = getStage(track, level)!;

  if (level > progress.unlocked[track]) {
    return (
      <RetroWindow title="잠긴 단계" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">
          아직 열리지 않은 단계예요. 지금 도전할 단계는 {stageName(progress.unlocked[track])}예요.
        </p>
        <div className="mt-4 flex gap-2">
          <PixelLink href={`/practice/${track}/${progress.unlocked[track]}`} size="sm" variant="success">
            {stageName(progress.unlocked[track])} 하러 가기
          </PixelLink>
          <PixelLink href="/practice" size="sm" variant="ghost">
            트랙 맵
          </PixelLink>
        </div>
      </RetroWindow>
    );
  }

  return (
    <>
      {/* 기호·코드 단계는 연결된 파이썬 첫걸음 강으로 바로 갈 수 있게 */}
      {st.lessons.length > 0 && (
        <p className="mx-auto mb-3 flex w-full max-w-4xl flex-wrap items-center gap-2 font-pixel text-body text-navy-900">
          📘 이 단계는 파이썬 첫걸음
          {st.lessons.map((n) => (
            <Link key={n} href={`/learn/${n}`} title={lessonTitle(n)} className="border-2 border-navy-900 bg-paper px-2 font-bold hover:underline">
              {n}강
            </Link>
          ))}
          과 연결돼요. 헷갈리면 강의를 다시 봐요!
        </p>
      )}
      <RoundRunner
        request={{ kind: "practice", track, level }}
        title={`${stageName(level)} · ${st.level.title}`}
        subtitle={`${stageName(level)} · ${MODE_LABELS[st.level.mode]} · 목표 ${st.goalCpm}타, 정확도 ${st.minAccuracy}%`}
        actions={(save, retry) => (
          <>
            <PixelButton variant={save.unlockedLevel ? "ghost" : "success"} autoFocus={!save.unlockedLevel} onClick={retry}>
              ↻ 다시 하기
            </PixelButton>
            {save.unlockedLevel && (
              <PixelButton variant="success" autoFocus onClick={() => router.push(`/practice/${track}/${save.unlockedLevel}`)}>
                다음 단계 ▶
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
    </>
  );
}
