"use client";

import { useEffect, useState } from "react";
import { IO_KIND_LABELS, PARTS, SENSOR_ROUND, type IoKind, type Part } from "@/config/sensors";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { play } from "@/lib/sound";
import { SensorLearn } from "./SensorLearn";
import { useOnHide } from "@/lib/games/useOnHide";

/** 입력/출력 이유 (모든 부품에 같은 설명) */
const IO_WHY = {
  input: "바깥 세상의 정보를 알아내서 컴퓨터로 보내는 센서라서 입력이에요.",
  output: "컴퓨터의 명령을 받아 빛·소리·움직임으로 내보내는 액추에이터라서 출력이에요.",
};

// 센서·액추에이터 분류: 부품을 보고 아날로그/디지털 × 입력/출력 중에서 골라요 (숫자키 1~4)

/** 2×2 칸: 위 줄 입력(센서), 아래 줄 출력(액추에이터) / 왼쪽 아날로그, 오른쪽 디지털 */
const GRID: { kind: IoKind; key: string }[] = [
  { kind: "ai", key: "1" },
  { kind: "di", key: "2" },
  { kind: "ao", key: "3" },
  { kind: "do", key: "4" },
];

const pick = () => {
  const a = [...PARTS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, SENSOR_ROUND);
};

export function SensorQuiz() {
  // 처음엔 "알아보기"부터 읽고 문제를 풀어요
  const [learned, setLearned] = useState(false);
  const [list, setList] = useState<Part[]>(pick);
  const [i, setI] = useState(0);
  // 이 문제에서 이미 고른 틀린 답들, 정답을 찾았는지 (틀려도 정답을 바로 보여 주지 않고 다시 골라요)
  const [tried, setTried] = useState<IoKind[]>([]);
  const [solved, setSolved] = useState(false);
  /** 처음에 틀린 부품 (점수는 처음 고른 답으로 매겨요) */
  const [wrong, setWrong] = useState<Part[]>([]);
  const part = list[i];
  const chosen = solved;

  const reset = () => {
    setList(pick());
    setI(0);
    setWrong([]);
    setTried([]);
    setSolved(false);
  };
  // 다른 메뉴에 갔다 오면 무조건 설명부터 다시 읽어요
  useOnHide(() => {
    setLearned(false);
    reset();
  });

  const choose = (k: IoKind) => {
    if (solved || !part || tried.includes(k)) return;
    if (k === part.kind) {
      play("pop");
      setSolved(true);
      return;
    }
    play("error");
    if (tried.length === 0) setWrong((w) => [...w, part]);
    setTried((t) => [...t, k]);
  };
  const next = () => {
    setTried([]);
    setSolved(false);
    setI((n) => n + 1);
  };
  const isInput = (k: IoKind) => k === "ai" || k === "di";
  // 마지막에 고른 틀린 답으로 힌트: 입력/출력이 틀렸는지, 아날로그/디지털이 틀렸는지
  const last = tried.at(-1);
  const hint =
    part && last
      ? isInput(last) !== isInput(part.kind)
        ? "입력·출력을 다시 생각해 봐요. 이 부품은 무엇을 알아내나요(입력), 아니면 무엇을 하나요(출력)?"
        : "입력·출력은 맞았어요! 값이 0과 1 두 가지인지(디지털), 여러 단계인지(아날로그) 다시 생각해 봐요."
      : "";

  // 숫자키 1~4로 고르고, Enter로 다음
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!learned) return;
      const g = GRID.find((x) => x.key === e.key);
      if (g && !solved) choose(g.kind);
      // Enter 는 "다음" 버튼이 받아요 (버튼에 포커스가 없을 때만 여기서)
      else if (e.key === "Enter" && solved && !(e.target instanceof HTMLButtonElement)) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!learned) return <SensorLearn onStart={() => setLearned(true)} />;

  if (!part) {
    const score = list.length - wrong.length;
    return (
      <RetroWindow title="분류 끝!" className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-3 font-pixel text-body text-navy-900">
          <p className="title-lime text-hero">
            {score} / {list.length}
          </p>
          <p>{score === list.length ? "모두 한 번에 맞혔다! 피지컬 컴퓨팅 박사!" : "점수는 처음 고른 답으로 매겨요. 헷갈렸던 부품을 다시 봐요."}</p>
          {wrong.length > 0 && (
            <ul className="w-full">
              {wrong.map((p) => (
                <li key={p.name} className="border-b border-win-shadow py-1">
                  {p.icon} <strong>{p.name}</strong> → {IO_KIND_LABELS[p.kind]} · <span className="text-small">{p.why}</span>
                </li>
              ))}
            </ul>
          )}
          <PixelButton variant="ghost" onClick={() => setLearned(false)}>
            설명 다시 보기
          </PixelButton>
          <PixelButton
            variant="success"
            autoFocus
            onClick={reset}
          >
            ↻ 다시 하기
          </PixelButton>
        </div>
      </RetroWindow>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex flex-col items-center gap-2 bg-navy-900 px-4 py-4 text-center">
        <MissionLabel keyword="NEW">이 부품은 어디에 들어갈까?</MissionLabel>
        <p className="font-pixel text-small text-sky-100">
          센서는 입력, 액추에이터(움직이고 빛나고 소리 내는 것)는 출력 · 값이 여러 단계면 아날로그, 0과 1 두 가지면 디지털
        </p>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={() => setLearned(false)} className="font-pixel text-small text-navy-900 underline underline-offset-4">
          📖 입력·출력, 아날로그·디지털 설명 다시 보기
        </button>
      </div>
      <RetroWindow title={`부품 ${i + 1} / ${list.length}`}>
        <div className="flex flex-col items-center gap-1 py-2 text-center">
          <span className="text-[64px] leading-none" aria-hidden>
            {part.icon}
          </span>
          <p className="font-title text-title text-navy-900">{part.name}</p>
          <p className="font-pixel text-body text-text-muted">{part.desc}</p>
        </div>
        <div className="mt-2 grid grid-cols-[auto_1fr_1fr] gap-2 font-pixel text-body text-navy-900">
          <span />
          <span className="text-center text-small font-bold">아날로그 (여러 값)</span>
          <span className="text-center text-small font-bold">디지털 (0 / 1)</span>
          {(["입력", "출력"] as const).map((row, r) => (
            <div key={row} className="contents">
              <span className="flex items-center text-small font-bold">{row}</span>
              {GRID.slice(r * 2, r * 2 + 2).map((g) => {
                const isAnswer = solved && g.kind === part.kind;
                const isWrongPick = tried.includes(g.kind);
                return (
                  <button
                    key={g.kind}
                    type="button"
                    disabled={solved || isWrongPick}
                    onClick={() => choose(g.kind)}
                    className={`flex h-16 flex-col items-center justify-center border-3 border-navy-900 ${
                      isAnswer ? "bg-lime-400" : isWrongPick ? "bg-red-500 text-paper" : "win-bevel active:win-bevel-pressed"
                    }`}
                  >
                    <span className="font-bold">{IO_KIND_LABELS[g.kind]}</span>
                    <span className="text-small">[{g.key}]</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {!solved && hint && (
          <div className="mt-3 border-3 border-navy-900 bg-paper px-3 py-2 font-pixel text-body">
            <p className="font-bold text-red-500">아니에요! 다른 칸을 골라 봐요.</p>
            <p>💡 {hint}</p>
          </div>
        )}
        {chosen && (
          <div className={`mt-3 border-3 border-navy-900 px-3 py-2 font-pixel text-body ${tried.length === 0 ? "bg-lime-200" : "bg-paper"}`}>
            <p className="font-bold">{tried.length === 0 ? "정답! 한 번에 맞혔다!" : `찾았다! 정답은 ${IO_KIND_LABELS[part.kind]}`}</p>
            <p className="mt-1">
              <strong>{part.kind === "ai" || part.kind === "di" ? "입력" : "출력"}</strong> · {part.kind === "ai" || part.kind === "di" ? IO_WHY.input : IO_WHY.output}
            </p>
            <p>
              <strong>{part.kind === "ai" || part.kind === "ao" ? "아날로그" : "디지털"}</strong> · {part.why}
            </p>
            <PixelButton size="sm" variant="success" className="mt-2" autoFocus onClick={next}>
              다음 ▶ (Enter)
            </PixelButton>
          </div>
        )}
      </RetroWindow>
    </div>
  );
}
