"use client";

import { useState } from "react";
import type { LessonSlide } from "@/data/codeNotes";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";

/** 확인 문제: 틀리면 그 보기만 막고 다시 고르게 함. 맞히면 이유를 보여 줌 (점수에는 안 들어감) */
function Check({ check }: { check: NonNullable<LessonSlide["check"]> }) {
  // 보기 순서는 처음 그릴 때 한 번만 섞음 (정답은 데이터에서 0번)
  const [order] = useState(() => check.choices.map((_, i) => i).sort(() => Math.random() - 0.5));
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  return (
    <div className="flex flex-col gap-2 border-3 border-navy-900 bg-paper px-4 py-3">
      <p className="font-pixel text-body font-bold">✋ 확인 문제 · {check.q}</p>
      <div className="flex flex-col gap-2">
        {order.map((i) => {
          const isAnswer = i === check.answer;
          const isWrong = wrong.includes(i);
          const style =
            solved && isAnswer
              ? "border-3 border-navy-900 bg-lime-400"
              : isWrong
                ? "border-3 border-red-500 bg-[var(--typing-space-error)] line-through decoration-red-500"
                : solved
                  ? "border-3 border-win-shadow opacity-60"
                  : "win-bevel";
          return (
            <button
              key={i}
              type="button"
              disabled={solved || isWrong}
              onClick={() => (isAnswer ? setSolved(true) : setWrong([...wrong, i]))}
              className={`whitespace-pre-wrap px-3 py-1 text-left font-typing text-body text-navy-900 ${style}`}
            >
              {check.choices[i]}
            </button>
          );
        })}
      </div>
      {!solved && wrong.length > 0 && (
        <p role="status" className="font-pixel text-body text-red-500">
          아쉬워요! 위 설명을 다시 읽어 보고, 다른 답을 골라 볼까요?
        </p>
      )}
      {solved && (
        <p className="font-pixel text-body text-lime-800">
          정답! <span className="text-navy-900">{check.why}</span>
        </p>
      )}
    </div>
  );
}

/** 강의 설명 슬라이드: 한 장씩 읽고 → 마지막에 "직접 쳐 보기" */
export function LessonSlides({
  n,
  title,
  slides,
  onDone,
}: {
  n: number;
  title: string;
  slides: LessonSlide[];
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const slide = slides[i];
  const last = i === slides.length - 1;

  return (
    <RetroWindow title={`파이썬 첫걸음 ${n}강 · ${title}`} className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-small text-text-muted">
            {i + 1} / {slides.length}
          </span>
          <div className="flex-1">
            <PixelProgressBar value={(i + 1) / slides.length} cells={slides.length} label="설명 진행" />
          </div>
        </div>

        <h2 className="font-title text-title text-navy-900">{slide.title}</h2>
        <div className="flex flex-col gap-3 font-pixel text-body leading-8 text-navy-900">
          {slide.body.map((p, k) => (
            <p key={k}>{p}</p>
          ))}
        </div>

        {slide.code && (
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="font-pixel text-small text-text-muted">코드</p>
              <pre className="h-full border-3 border-navy-900 bg-surface px-4 py-3 font-typing text-body text-navy-900">{slide.code}</pre>
            </div>
            {slide.output !== undefined && (
              <div>
                <p className="font-pixel text-small text-text-muted">실행 결과</p>
                <pre className="h-full bg-ink px-4 py-3 font-typing text-body text-lime-400">{slide.output}</pre>
              </div>
            )}
          </div>
        )}

        {slide.check && <Check key={i} check={slide.check} />}

        <div className="flex items-center justify-between">
          <PixelButton variant="ghost" size="sm" disabled={i === 0} onClick={() => setI(i - 1)}>
            ◀ 이전
          </PixelButton>
          {last ? (
            <PixelButton variant="success" autoFocus onClick={onDone}>
              이제 직접 쳐 볼까요? ▶
            </PixelButton>
          ) : (
            <PixelButton variant="primary" autoFocus key={i} onClick={() => setI(i + 1)}>
              다음 ▶ (Enter)
            </PixelButton>
          )}
        </div>
      </div>
    </RetroWindow>
  );
}
