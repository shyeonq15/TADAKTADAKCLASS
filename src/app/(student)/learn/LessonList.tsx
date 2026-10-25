"use client";

import Link from "next/link";
import { LESSON_COUNT, lessonTitle } from "@/data/codeNotes";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { usePracticeData } from "@/lib/practice/store";

export function LessonList() {
  const { progress } = usePracticeData();
  const done = (n: number) => progress.cleared.includes(`lesson-${n}`);
  const doneCount = Array.from({ length: LESSON_COUNT }, (_, i) => i + 1).filter(done).length;

  return (
    <RetroWindow title={`강의 목록 (${doneCount} / ${LESSON_COUNT})`}>
      <PixelProgressBar value={doneCount / LESSON_COUNT} cells={LESSON_COUNT} label="파이썬 첫걸음 진도" />
      <ol className="mt-4 grid gap-2 md:grid-cols-2">
        {Array.from({ length: LESSON_COUNT }, (_, i) => i + 1).map((n) => {
          const isDone = done(n);
          const open = n === 1 || done(n - 1);
          const body = (
            <span
              className={`flex items-center gap-3 px-3 py-2 font-pixel text-body ${
                isDone ? "win-bevel bg-lime-200" : open ? "win-bevel bg-yellow-400 font-bold" : "win-bevel-pressed bg-win-gray text-text-muted"
              }`}
            >
              <span className="w-10 font-title text-heading">{n}강</span>
              <span className="flex-1">{lessonTitle(n)}</span>
              <span>{isDone ? "✅" : open ? "▶" : "🔒"}</span>
            </span>
          );
          return <li key={n}>{open ? <Link href={`/learn/${n}`}>{body}</Link> : body}</li>;
        })}
      </ol>
      <p className="mt-3 font-pixel text-small text-text-muted">
        정확도 80% 이상으로 따라 치면 그 강을 통과하고 다음 강이 열려요. 다 배운 뒤에는 코드 트랙 레벨과 빈칸 채우기로 연습해요.
      </p>
    </RetroWindow>
  );
}
