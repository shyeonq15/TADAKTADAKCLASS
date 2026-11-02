"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LESSON_COUNT, lessonSlides, lessonTitle } from "@/data/codeNotes";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { nextLesson } from "@/lib/practice/stages";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { usePracticeData } from "@/lib/practice/store";
import { LessonSlides } from "./LessonSlides";

export function LessonRound({ n }: { n: number }) {
  const router = useRouter();
  const { progress } = usePracticeData();
  // 먼저 설명 슬라이드를 읽고 → 직접 따라 치기
  const [phase, setPhase] = useState<"slides" | "practice">("slides");

  // 강은 1강부터 차례대로: 앞 강을 아직 안 들었으면 들어가지 않고 안내만
  const next = nextLesson(progress.cleared, LESSON_COUNT);
  const locked = n > 1 && !progress.cleared.includes(`lesson-${n - 1}`);
  if (locked && next !== null) {
    return (
      <RetroWindow title="아직 잠겨 있어요" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">
          🔒 {n}강은 앞 강을 다 들으면 열려요. 강은 1강부터 차례대로 들어요. 지금 들을 차례는 <strong>{next}강 · {lessonTitle(next)}</strong>이에요!
        </p>
        <div className="mt-4 flex gap-2">
          <PixelLink href={`/learn/${next}`} size="sm" variant="success" autoFocus>
            {next}강 들으러 가기 (Enter)
          </PixelLink>
          <PixelLink href="/learn" size="sm" variant="ghost">
            강의 목록
          </PixelLink>
        </div>
      </RetroWindow>
    );
  }

  if (phase === "slides") {
    return <LessonSlides key={n} n={n} title={lessonTitle(n)} slides={lessonSlides(n)} onDone={() => setPhase("practice")} />;
  }

  return (
    <RoundRunner
      key={n}
      autoStart
      request={{ kind: "lesson", track: "code", lesson: n }}
      title={`파이썬 첫걸음 ${n}강 · ${lessonTitle(n)}`}
      subtitle={`${n}강 · ${lessonTitle(n)}`}
      actions={(save, retry) => {
        const passed = !!save.lessonDone || progress.cleared.includes(`lesson-${n}`);
        return (
          <>
            {passed && n < LESSON_COUNT && (
              <PixelButton variant="success" autoFocus onClick={() => router.push(`/learn/${n + 1}`)}>
                {n + 1}강으로 ▶
              </PixelButton>
            )}
            <PixelButton variant={passed ? "ghost" : "success"} autoFocus={!passed} onClick={retry}>
              ↻ 다시 하기
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setPhase("slides")}>
              설명 다시 보기
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => router.push("/learn")}>
              강의 목록
            </PixelButton>
            {!passed && (
              <p className="w-full text-center font-pixel text-small text-navy-900">정확도 80% 이상이면 통과예요. 천천히 정확하게!</p>
            )}
          </>
        );
      }}
    />
  );
}
