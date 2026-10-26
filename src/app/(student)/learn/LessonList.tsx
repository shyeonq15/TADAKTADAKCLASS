"use client";

import Link from "next/link";
import { LESSON_COUNT, lessonTitle, lessonUnit } from "@/data/codeNotes";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { usePracticeData } from "@/lib/practice/store";

/** 강 번호를 단원별로 묶기 (lessons.json 의 unit 이 바뀌는 곳에서 새 단원) */
function byUnit() {
  const groups: { unit: string; lessons: number[] }[] = [];
  for (let n = 1; n <= LESSON_COUNT; n++) {
    const unit = lessonUnit(n);
    const last = groups[groups.length - 1];
    if (last && last.unit === unit) last.lessons.push(n);
    else groups.push({ unit, lessons: [n] });
  }
  return groups;
}

const GROUPS = byUnit();

export function LessonList() {
  const { progress } = usePracticeData();
  const done = (n: number) => progress.cleared.includes(`lesson-${n}`);
  const doneCount = Array.from({ length: LESSON_COUNT }, (_, i) => i + 1).filter(done).length;

  return (
    <RetroWindow title={`강의 목록 (${doneCount} / ${LESSON_COUNT})`}>
      <PixelProgressBar value={doneCount / LESSON_COUNT} cells={LESSON_COUNT} label="파이썬 첫걸음 진도" />
      <div className="mt-4 flex flex-col gap-4">
        {GROUPS.map((g) => {
          const unitDone = g.lessons.filter(done).length;
          return (
            <section key={g.unit || g.lessons[0]}>
              <h2 className="mb-2 flex items-baseline gap-2 border-b-2 border-navy-900 pb-1 font-title text-heading text-navy-900">
                {g.unit || "강의"}
                <span className="font-pixel text-small text-text-muted">
                  {unitDone} / {g.lessons.length}
                  {unitDone === g.lessons.length ? " ✅" : ""}
                </span>
              </h2>
              <ol className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {g.lessons.map((n) => {
                  const isDone = done(n);
                  const open = n === 1 || done(n - 1);
                  const body = (
                    <span
                      className={`flex items-center gap-2 px-2 py-1.5 font-pixel text-small ${
                        isDone ? "win-bevel bg-lime-200" : open ? "win-bevel bg-yellow-400 font-bold" : "win-bevel-pressed bg-win-gray text-text-muted"
                      }`}
                    >
                      <span className="w-9 shrink-0 font-title text-body">{n}강</span>
                      <span className="min-w-0 flex-1 truncate" title={lessonTitle(n)}>
                        {lessonTitle(n)}
                      </span>
                      <span>{isDone ? "✅" : open ? "▶" : "🔒"}</span>
                    </span>
                  );
                  return <li key={n}>{open ? <Link href={`/learn/${n}`}>{body}</Link> : body}</li>;
                })}
              </ol>
            </section>
          );
        })}
      </div>
      <p className="mt-3 font-pixel text-small text-text-muted">
        정확도 80% 이상으로 따라 치면 그 강을 통과하고 다음 강이 열려요. 다 배운 뒤에는 코드 트랙과 빈칸 채우기로 연습해요.
      </p>
    </RetroWindow>
  );
}
