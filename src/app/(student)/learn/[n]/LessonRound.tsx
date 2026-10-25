"use client";

import { useRouter } from "next/navigation";
import { LESSON_COUNT, lessonTitle } from "@/data/codeNotes";
import { PixelButton } from "@/components/ui/PixelButton";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { usePracticeData } from "@/lib/practice/store";

export function LessonRound({ n }: { n: number }) {
  const router = useRouter();
  const { progress } = usePracticeData();

  return (
    <RoundRunner
      key={n}
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
