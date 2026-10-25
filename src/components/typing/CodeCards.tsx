"use client";

import { useState } from "react";
import type { CodeNote } from "@/data/codeNotes";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import type { Mask } from "./TypingArea";

/** 치기 전: 이 코드가 하는 일 + 줄마다 풀이 */
export function CodeExplainCard({
  lines,
  note,
  mask,
  onStart,
}: {
  lines: string[];
  note: CodeNote;
  mask?: Mask;
  onStart: () => void;
}) {
  return (
    <RetroWindow title={mask ? "빈칸 채우기 - 코드 설명" : "코드 설명 카드"} className="mx-auto w-full max-w-4xl">
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-3 font-pixel text-body">
          <span className="bg-ink px-2 py-1 font-title text-small text-paper">개념</span>
          <strong className="text-heading">{note.concept}</strong>
        </p>
        <div className="flex flex-col gap-2 font-pixel text-body leading-7">
          {note.explain.split("\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        {note.tip && (
          <p className="border-3 border-navy-900 bg-yellow-400 px-3 py-2 font-pixel text-small text-navy-900">💡 {note.tip}</p>
        )}
        <table className="w-full border-3 border-navy-900 bg-surface">
          <tbody>
            {lines.map((line, i) => {
              const hidden =
                mask && mask.line === i
                  ? line.slice(0, mask.start) + "_".repeat(mask.length) + line.slice(mask.start + mask.length)
                  : line;
              return (
                <tr key={i} className="border-b border-sky-200 align-top">
                  <td className="w-8 select-none px-2 py-1 text-right font-typing text-small text-text-muted">{i + 1}</td>
                  <td className="whitespace-pre px-2 py-1 font-typing text-body text-navy-900">{hidden}</td>
                  <td className="px-2 py-1 font-pixel text-small text-navy-700">{note.lines[i] ? `← ${note.lines[i]}` : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {mask && (
          <p className="font-pixel text-small text-navy-900">
            💡 <strong>____</strong> 부분은 가려져 있어요. 풀이를 보고 무엇이 들어갈지 생각하며 쳐 보세요. 틀리면 빨간색으로 알려 줘요.
          </p>
        )}
        <div className="flex justify-center">
          <PixelButton variant="success" autoFocus onClick={onStart}>
            ▶ 이해했어요, 타자 시작 (Enter)
          </PixelButton>
        </div>
      </div>
    </RetroWindow>
  );
}

/** 치는 동안 위에 계속 보이는 문제·풀이 (지금 치는 줄의 풀이가 따라 바뀜) */
export function CodeHint({ note, lineIndex, mask }: { note: CodeNote; lineIndex: number; mask?: Mask }) {
  const lineNote = note.lines[lineIndex];
  return (
    <div className="flex flex-col gap-1 border-3 border-navy-900 bg-cream px-4 py-2 font-pixel text-body text-navy-900">
      <p className="flex flex-wrap items-center gap-2">
        <span className="bg-ink px-2 font-title text-small text-paper">개념</span>
        <strong>{note.concept}</strong>
        <span className="text-small text-text-muted">· {note.explain.split("\n")[0]}</span>
      </p>
      <p>
        <span className="font-bold">{lineIndex + 1}번 줄</span>{" "}
        {mask && mask.line === lineIndex && <span className="bg-lime-200 px-1">🧩 빈칸이 있는 줄!</span>}{" "}
        {lineNote ? `← ${lineNote}` : ""}
      </p>
    </div>
  );
}

/** 치고 나서: 실행하면 무엇이 나올까? (4지선다) */
export function CodeQuizCard({
  lines,
  note,
  choices,
  onDone,
}: {
  lines: string[];
  note: CodeNote;
  /** 섞인 보기 4개 (정답 포함) */
  choices: string[];
  onDone: (correct: boolean) => void;
}) {
  // 틀린 보기는 빨갛게 막고 다시 고르게 함. 정답을 고를 때까지 답을 보여 주지 않음
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  return (
    <RetroWindow title="결과 맞히기" className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4">
        <pre className="border-3 border-navy-900 bg-surface px-4 py-3 font-typing text-body text-navy-900">{lines.join("\n")}</pre>
        <p className="font-pixel text-heading">Q. {note.question ?? "이 코드를 실행하면 무엇이 출력될까요?"}</p>
        <div className="grid gap-2 md:grid-cols-2">
          {choices.map((c, i) => {
            const isAnswer = c === note.output;
            const isWrong = wrong.includes(i);
            const style =
              solved && isAnswer
                ? "border-3 border-navy-900 bg-lime-400"
                : isWrong
                  ? "border-3 border-red-500 bg-[var(--typing-space-error)] line-through decoration-red-500"
                  : solved
                    ? "border-3 border-win-shadow bg-paper opacity-60"
                    : "win-bevel";
            return (
              <button
                key={i}
                type="button"
                disabled={solved || isWrong}
                autoFocus={i === 0}
                onClick={() => (isAnswer ? setSolved(true) : setWrong([...wrong, i]))}
                className={`flex items-start gap-3 px-3 py-2 text-left ${style}`}
              >
                <span className="font-title text-body">{i + 1}</span>
                <pre className="whitespace-pre-wrap font-typing text-body text-navy-900">{c}</pre>
              </button>
            );
          })}
        </div>
        {!solved && wrong.length > 0 && (
          <p role="status" className="font-pixel text-body text-red-500">
            &gt; 아쉬워요! 코드를 한 줄씩 다시 읽어 보고, 다른 답을 골라 볼까요?
          </p>
        )}
        {solved && (
          <div className="flex flex-col gap-3">
            <p className="font-pixel text-heading text-lime-800">
              {wrong.length === 0 ? "> 한 번에 정답! 코드를 읽는 눈이 생겼다!" : "> 정답! 끝까지 생각해서 찾아냈다!"}
            </p>
            <div>
              <p className="font-pixel text-small text-text-muted">실제 출력</p>
              <pre className="bg-ink px-4 py-3 font-typing text-body text-lime-400">{note.output}</pre>
            </div>
            <div className="flex justify-center">
              <PixelButton variant="success" autoFocus onClick={() => onDone(wrong.length === 0)}>
                계속하기 ▶
              </PixelButton>
            </div>
          </div>
        )}
      </div>
    </RetroWindow>
  );
}

/** 보기 섞기 (정답 + 오답 3개) */
export function quizChoices(note: CodeNote) {
  const all = [note.output, ...note.choices];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}
