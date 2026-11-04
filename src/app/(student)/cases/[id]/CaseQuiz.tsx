"use client";

import { useEffect, useState } from "react";
import { caseQuizDone } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import type { CaseItem, CaseSet } from "@/config/cases";
import { safeCall } from "@/lib/practice/call";
import { useSetPracticeData } from "@/lib/practice/store";
import { play } from "@/lib/sound";

// 사례 분류 퀴즈: 사례를 읽고 보기 4개 중 하나를 골라요 (숫자키 1~4).
// 틀리면 정답을 바로 보여 주지 않고 다시 골라요. 맞히면 이유를 보여 줘요. 점수는 처음 고른 답으로.

const shuffle = <T,>(a: readonly T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

export function CaseQuiz({ set, backHref }: { set: CaseSet; backHref: string }) {
  const setData = useSetPracticeData();
  const [started, setStarted] = useState(false);
  const [list, setList] = useState<CaseItem[]>(() => shuffle(set.items));
  const [i, setI] = useState(0);
  const [tried, setTried] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [end, setEnd] = useState<string | null>(null);
  const item = list[i];

  const choose = (k: number) => {
    if (!item || solved || tried.includes(k)) return;
    if (k === item.answer) {
      if (tried.length === 0) setScore((n) => n + 1);
      setSolved(true);
      play("pop");
    } else {
      setTried((t) => [...t, k]);
      play("error");
    }
  };

  const next = async () => {
    if (!solved) return;
    if (i + 1 < list.length) {
      setI(i + 1);
      setTried([]);
      setSolved(false);
      return;
    }
    const res = await safeCall(() => caseQuizDone(set.id));
    let message = score === list.length ? "모두 한 번에 맞혔다! 대단해요!" : "끝까지 해냈다! 헷갈린 사례는 이유를 다시 읽어 봐요.";
    if (!("error" in res)) {
      setData(res.data);
      if (res.coins > 0) message += ` 처음 끝내서 코인 ${res.coins}개를 획득했다!`;
    }
    setEnd(message);
  };

  // 숫자키 1~4로 고르기, Enter로 다음
  useEffect(() => {
    if (!started || end) return;
    const onKey = (e: KeyboardEvent) => {
      if (["1", "2", "3", "4"].includes(e.key)) choose(Number(e.key) - 1);
      else if (e.key === "Enter") void next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const restart = () => {
    setList(shuffle(set.items));
    setI(0);
    setTried([]);
    setSolved(false);
    setScore(0);
    setEnd(null);
  };

  if (!started) {
    return (
      <RetroWindow title={`${set.icon} ${set.title}`} className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-4 font-pixel text-body text-navy-900">
          <MissionLabel keyword="MISSION">{set.question}</MissionLabel>
          <p>사례를 읽고 숫자키 1~4로 골라요. 틀리면 다시 고를 수 있어요. 먼저 네 가지 뜻을 읽어 봐요!</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {set.choices.map((c, k) => (
              <li key={c} className="border-3 border-navy-900 bg-paper px-3 py-2">
                <p className="font-title text-heading">
                  {k + 1}. {c}
                </p>
                <p className="text-small">{set.notes[k]}</p>
              </li>
            ))}
          </ul>
          <PixelButton variant="success" autoFocus onClick={() => setStarted(true)}>
            ▶ 시작하기 ({set.items.length}문제)
          </PixelButton>
        </div>
      </RetroWindow>
    );
  }

  if (end) {
    return (
      <RetroWindow title={`${set.title} 끝!`} className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-4 text-center font-pixel text-body">
          <p className="title-lime text-hero">
            {score} / {list.length}
          </p>
          <p className="text-small text-text-muted">한 번에 맞힌 사례</p>
          <DialogBox text={end} />
          <div className="flex flex-wrap justify-center gap-2">
            <PixelButton variant="success" autoFocus onClick={restart}>
              ↻ 한 번 더
            </PixelButton>
            <PixelLink href={backHref} variant="ghost">
              교과 탐험으로
            </PixelLink>
          </div>
        </div>
      </RetroWindow>
    );
  }

  return (
    <RetroWindow title={`${set.icon} ${set.title} ${i + 1} / ${list.length}`} className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 font-pixel text-body text-navy-900">
        <div className="win-bevel-pressed h-3 bg-paper">
          <div className="h-full bg-lime-400" style={{ width: `${(i / list.length) * 100}%` }} />
        </div>
        <p className="text-small font-bold">{set.question}</p>
        <p className="border-3 border-navy-900 bg-paper px-5 py-6 font-title text-title leading-snug">{item.text}</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {set.choices.map((c, k) => {
            const wrong = tried.includes(k);
            const right = solved && k === item.answer;
            return (
              <button
                key={c}
                type="button"
                onClick={() => choose(k)}
                disabled={wrong || solved}
                className={`win-bevel flex flex-col items-center px-2 py-3 ${
                  right ? "bg-lime-200 font-bold" : wrong ? "bg-win-gray text-text-muted line-through" : "bg-paper hover:bg-sky-100"
                }`}
              >
                <span className="text-small">{k + 1}</span>
                <span className="font-title text-heading">{c}</span>
              </button>
            );
          })}
        </div>
        {!solved && tried.length > 0 && (
          <p role="status" className="border-3 border-red-500 bg-paper px-3 py-2 text-red-500">
            아쉬워요! 다시 골라 봐요.
          </p>
        )}
        {solved && (
          <div role="status" className="border-3 border-navy-900 bg-lime-200 px-3 py-2">
            <p className="font-bold">정답! {set.choices[item.answer]}</p>
            <p>{item.why}</p>
          </div>
        )}
        <PixelButton variant="success" disabled={!solved} onClick={() => void next()}>
          {i + 1 < list.length ? "다음 사례 ▶ (Enter)" : "끝내기 (Enter)"}
        </PixelButton>
      </div>
    </RetroWindow>
  );
}
