"use client";

import { useEffect, useState } from "react";
import { IO_KIND_LABELS, PARTS, SENSOR_ROUND, type IoKind, type Part } from "@/config/sensors";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { play } from "@/lib/sound";

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
  const [list, setList] = useState<Part[]>(pick);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<IoKind | null>(null);
  const [wrong, setWrong] = useState<Part[]>([]);
  const part = list[i];

  const choose = (k: IoKind) => {
    if (chosen || !part) return;
    setChosen(k);
    if (k === part.kind) play("pop");
    else {
      play("error");
      setWrong((w) => [...w, part]);
    }
  };
  const next = () => {
    setChosen(null);
    setI((n) => n + 1);
  };

  // 숫자키 1~4로 고르고, Enter로 다음
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = GRID.find((x) => x.key === e.key);
      if (g && !chosen) choose(g.kind);
      // Enter 는 "다음" 버튼이 받아요 (버튼에 포커스가 없을 때만 여기서)
      else if (e.key === "Enter" && chosen && !(e.target instanceof HTMLButtonElement)) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!part) {
    const score = list.length - wrong.length;
    return (
      <RetroWindow title="분류 끝!" className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-3 font-pixel text-body text-navy-900">
          <p className="title-lime text-hero">
            {score} / {list.length}
          </p>
          <p>{score === list.length ? "모두 맞혔다! 피지컬 컴퓨팅 박사!" : "다음엔 더! 틀린 부품을 다시 봐요."}</p>
          {wrong.length > 0 && (
            <ul className="w-full">
              {wrong.map((p) => (
                <li key={p.name} className="border-b border-win-shadow py-1">
                  {p.icon} <strong>{p.name}</strong> → {IO_KIND_LABELS[p.kind]} · <span className="text-small">{p.why}</span>
                </li>
              ))}
            </ul>
          )}
          <PixelButton
            variant="success"
            autoFocus
            onClick={() => {
              setList(pick());
              setI(0);
              setWrong([]);
              setChosen(null);
            }}
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
                const isAnswer = chosen && g.kind === part.kind;
                const isWrongPick = chosen === g.kind && g.kind !== part.kind;
                return (
                  <button
                    key={g.kind}
                    type="button"
                    disabled={!!chosen}
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
        {chosen && (
          <div className={`mt-3 border-3 border-navy-900 px-3 py-2 font-pixel text-body ${chosen === part.kind ? "bg-lime-200" : "bg-paper"}`}>
            <p className="font-bold">{chosen === part.kind ? "정답!" : `아쉬워요! 정답은 ${IO_KIND_LABELS[part.kind]}`}</p>
            <p>{part.why}</p>
            <PixelButton size="sm" variant="success" className="mt-2" autoFocus onClick={next}>
              다음 ▶ (Enter)
            </PixelButton>
          </div>
        )}
      </RetroWindow>
    </div>
  );
}
