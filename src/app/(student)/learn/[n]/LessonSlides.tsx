"use client";

import { useEffect, useState } from "react";
import { ColoredCode, RichText } from "@/components/learn/RichText";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BUNNY } from "@/components/pixel/sprites";
import type { LessonSlide } from "@/data/codeNotes";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";

/** 확인 문제: 틀리면 그 보기만 막고 다시 고르게 함. 맞혀야 다음 장으로 넘어가요 (점수에는 안 들어감) */
function Check({
  check,
  solvedBefore,
  onSolved,
}: {
  check: NonNullable<LessonSlide["check"]>;
  solvedBefore: boolean;
  onSolved: () => void;
}) {
  // 보기 순서는 처음 그릴 때 한 번만 섞음 (정답은 데이터에서 0번)
  const [order] = useState(() => check.choices.map((_, i) => i).sort(() => Math.random() - 0.5));
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(solvedBefore);

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
              onClick={() => {
                if (!isAnswer) return setWrong([...wrong, i]);
                setSolved(true);
                onSolved();
              }}
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

/** 장 종류: 제목 앞부분으로 알아내서 색깔 이름표를 붙여요 */
const KINDS = [
  { prefix: "생각 열기", icon: "💡", label: "생각 열기", tag: "bg-yellow-400" },
  { prefix: "한눈에 정리", icon: "📌", label: "한눈에 정리", tag: "bg-lime-400" },
  { prefix: "문제로 확인", icon: "✋", label: "확인 문제", tag: "bg-pink-400" },
  { prefix: "자주 하는 실수", icon: "⚠️", label: "조심!", tag: "bg-red-500 text-paper" },
] as const;
const kindOf = (title: string) => KINDS.find((k) => title.startsWith(k.prefix)) ?? { icon: "📘", label: "개념", tag: "bg-sky-300" };

/** 실행 결과: Enter(또는 "▶ 실행")를 누르면 한 글자씩 나와요 */
function RunOutput({ output, running, onRun }: { output: string; running: boolean; onRun: () => void }) {
  const [count, setCount] = useState(0);
  const shown = running ? count : null;
  useEffect(() => {
    if (!running || count >= output.length) return;
    const id = window.setTimeout(() => setCount((n) => Math.min(output.length, n + 2)), 30);
    return () => window.clearTimeout(id);
  }, [running, count, output.length]);
  return (
    <div>
      <p className="flex items-center justify-between font-pixel text-small text-text-muted">
        실행 결과
        {shown === null && (
          <button type="button" onClick={onRun} className="win-bevel px-2 font-bold text-navy-900 active:win-bevel-pressed">
            ▶ 실행
          </button>
        )}
      </p>
      <pre className="h-full min-h-16 bg-ink px-4 py-3 font-typing text-body text-lime-400">
        {shown === null ? <span className="text-text-muted">Enter를 누르면 실행돼요</span> : output.slice(0, shown)}
        {shown !== null && shown < output.length && <span className="blink">▌</span>}
      </pre>
    </div>
  );
}

/** 한 장: 토끼 선생님 말풍선이 하나씩 나오고, 그다음 예시 코드 */
function Slide({ slide, revealed, ran, onRun }: { slide: LessonSlide; revealed: number; ran: boolean; onRun: () => void }) {
  const kind = kindOf(slide.title);
  const steps = slide.body.length;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`animate-pop-in border-3 border-navy-900 px-2 py-0.5 font-pixel text-small font-bold text-navy-900 ${kind.tag}`}>
          {kind.icon} {kind.label}
        </span>
        <h2 className="font-title text-title text-navy-900">
          <RichText text={slide.title} />
        </h2>
      </div>

      {steps > 0 && (
        <div className="flex gap-3">
          <PixelSprite sprite={BUNNY} scale={4} className="animate-bob mt-2 shrink-0 -scale-x-100" />
          <div className="flex flex-1 flex-col gap-2">
            {slide.body.slice(0, revealed).map((p, k) => (
              <p
                key={k}
                className={`animate-pop-in relative border-3 border-navy-900 bg-paper px-4 py-2 font-pixel text-body leading-8 text-navy-900 shadow-pixel-sm ${k === revealed - 1 ? "" : "opacity-90"}`}
              >
                {/* 말풍선 꼬리 (첫 말풍선만) */}
                {k === 0 && <span aria-hidden className="absolute -left-3 top-4 h-0 w-0 border-y-8 border-r-[12px] border-y-transparent border-r-navy-900" />}
                <RichText text={p} />
              </p>
            ))}
            {revealed < steps && (
              <p className="font-pixel text-small text-text-muted">
                <span className="blink">▼</span> Enter를 누르면 다음 말이 나와요 ({revealed}/{steps})
              </p>
            )}
          </div>
        </div>
      )}

      {slide.code && revealed >= steps && (
        <div className="animate-pop-in grid gap-2 md:grid-cols-2">
          <div>
            <p className="font-pixel text-small text-text-muted">코드</p>
            <pre className="h-full border-3 border-navy-900 bg-surface px-4 py-3 font-typing text-body text-navy-900">
              <ColoredCode code={slide.code} />
            </pre>
          </div>
          {slide.output !== undefined && <RunOutput output={slide.output} running={ran} onRun={onRun} />}
        </div>
      )}
    </>
  );
}

/** 강의 설명 슬라이드: 한 장씩, 말풍선은 Enter 로 하나씩 → 마지막에 "직접 쳐 보기" */
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
  const [revealed, setRevealed] = useState(1);
  // 예시 코드 실행했는지 (말풍선이 다 나온 뒤 Enter 한 번 더 = 실행)
  const [ran, setRan] = useState(false);
  // 맞힌 확인 문제 (장 번호). 문제가 있는 장은 맞혀야 다음으로 넘어가요
  const [solved, setSolved] = useState<number[]>([]);
  const slide = slides[i];
  const last = i === slides.length - 1;
  const allShown = revealed >= slide.body.length;
  const blocked = !!slide.check && !solved.includes(i);
  const needsRun = allShown && !!slide.code && slide.output !== undefined && !ran;

  const go = (to: number) => {
    setI(to);
    setRevealed(1);
    setRan(false);
  };

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

        <Slide key={i} slide={slide} revealed={revealed} ran={ran} onRun={() => setRan(true)} />

        {slide.check && allShown && (
          <Check key={i} check={slide.check} solvedBefore={solved.includes(i)} onSolved={() => setSolved((v) => [...v, i])} />
        )}

        <div className="flex items-center justify-between gap-2">
          <PixelButton variant="ghost" size="sm" disabled={i === 0} onClick={() => go(i - 1)}>
            ◀ 이전
          </PixelButton>
          {!allShown && (
            <button type="button" onClick={() => setRevealed(slide.body.length)} className="font-pixel text-small text-text-muted underline underline-offset-4">
              한 번에 보기
            </button>
          )}
          {!allShown ? (
            <PixelButton variant="primary" autoFocus key={`more-${i}`} onClick={() => setRevealed((r) => r + 1)}>
              계속 ▼ (Enter)
            </PixelButton>
          ) : needsRun ? (
            <PixelButton variant="success" autoFocus key={`run-${i}`} onClick={() => setRan(true)}>
              ▶ 실행 (Enter)
            </PixelButton>
          ) : blocked ? (
            <PixelButton variant="primary" disabled>
              문제를 맞히면 넘어가요
            </PixelButton>
          ) : last ? (
            <PixelButton variant="success" autoFocus onClick={onDone}>
              이제 직접 쳐 볼까요? ▶
            </PixelButton>
          ) : (
            <PixelButton variant="primary" autoFocus key={`next-${i}`} onClick={() => go(i + 1)}>
              다음 ▶ (Enter)
            </PixelButton>
          )}
        </div>
      </div>
    </RetroWindow>
  );
}
