"use client";

import { useRouter } from "next/navigation";
import type { Track } from "@/config/game";
import { PixelButton } from "@/components/ui/PixelButton";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { usePracticeData, weakKeys } from "@/lib/practice/store";
import { buildWeakKeyRound } from "@/lib/typing/passage";

/** 약한 키 맞춤 연습 (PRD P6) */
export function WeakRound({ track }: { track: Track }) {
  const router = useRouter();
  const { attempts } = usePracticeData();
  const keys = weakKeys(attempts, track).map((k) => k.key);

  return (
    <RoundRunner
      track={track}
      level={0}
      mode="weak"
      kind="weak"
      title="약한 키 맞춤 연습"
      subtitle={keys.length ? `오늘은 ${keys.join(" ")} 키와 친해져요` : "아직 약한 키 기록이 없어서 고루 섞었어요"}
      buildLines={() => buildWeakKeyRound(track, keys)}
      actions={(_, retry) => (
        <>
          <PixelButton variant="success" autoFocus onClick={retry}>
            ↻ 한 번 더
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => router.push("/practice")}>
            트랙 맵
          </PixelButton>
        </>
      )}
    />
  );
}
