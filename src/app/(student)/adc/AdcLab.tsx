"use client";

import { useMemo, useState } from "react";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { getSettings } from "@/lib/settings";

// 아날로그 → 디지털 변환기 (정보 교과 복습)
//  · 표본화: 일정한 간격마다 곡선의 높이를 재요 (점이 많을수록 원래 소리에 가까워요)
//  · 양자화: 잰 높이를 정해진 단계(0~3, 0~7) 중 가장 가까운 숫자로 바꿔요 (비트가 많을수록 정확해요)
//  · 부호화: 그 숫자를 이진수로 → 컴퓨터가 저장해요

const W = 480;
const H = 240;
const PAD = 24;

type Setup = { samples: 8 | 12 | 16; bits: 2 | 3 };

/** 문제마다 다른 소리 곡선 (0~1) */
function waveOf(seed: number) {
  const p1 = (seed * 1.7) % (Math.PI * 2);
  const p2 = (seed * 2.3) % (Math.PI * 2);
  return (t: number) => 0.5 + 0.32 * Math.sin(Math.PI * 2 * t + p1) + 0.14 * Math.sin(Math.PI * 6 * t + p2);
}

export function AdcLab() {
  const [setup, setSetup] = useState<Setup>({ samples: 8, bits: 2 });
  const [seed, setSeed] = useState(1);
  const [typed, setTyped] = useState("");
  const levels = 2 ** setup.bits;
  const wave = useMemo(() => waveOf(seed), [seed]);
  const xs = Array.from({ length: setup.samples }, (_, i) => (i + 0.5) / setup.samples);
  const answer = xs.map((t) => Math.round(Math.min(1, Math.max(0, wave(t))) * (levels - 1)));
  const values = [...typed.replace(/[^0-9]/g, "")].slice(0, setup.samples).map(Number);
  const done = values.length === setup.samples;
  const correct = values.filter((v, i) => v === answer[i]).length;

  const px = (t: number) => PAD + t * (W - PAD * 2);
  const py = (y: number) => H - PAD - y * (H - PAD * 2);
  const analogPath = Array.from({ length: 121 }, (_, i) => {
    const t = i / 120;
    return `${i ? "L" : "M"}${px(t).toFixed(1)},${py(wave(t)).toFixed(1)}`;
  }).join(" ");
  // 내가 친 숫자로 만든 계단 모양 디지털 신호
  const stepPath = values
    .map((v, i) => {
      const y = py(v / (levels - 1));
      const x0 = px(i / setup.samples);
      const x1 = px((i + 1) / setup.samples);
      return `${i ? "L" : "M"}${x0.toFixed(1)},${y.toFixed(1)} L${x1.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  /** 소리로 들어 보기: 곡선 높이를 음 높이로 (아날로그는 부드럽게, 디지털은 계단처럼) */
  const listen = (digital: boolean) => {
    const a = new AudioContext();
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "triangle";
    const vol = Math.max(0.02, getSettings().volume / 100) * 0.15;
    g.gain.value = vol;
    const dur = 2.4;
    const t0 = a.currentTime + 0.05;
    if (digital) {
      values.forEach((v, i) => o.frequency.setValueAtTime(260 + (v / (levels - 1)) * 520, t0 + (i / setup.samples) * dur));
    } else {
      const curve = new Float32Array(200).map((_, i) => 260 + Math.min(1, Math.max(0, wave(i / 199))) * 520);
      o.frequency.setValueCurveAtTime(curve, t0, dur);
    }
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur);
    o.onended = () => void a.close();
  };

  const next = (patch?: Partial<Setup>) => {
    if (patch) setSetup({ ...setup, ...patch });
    setSeed((s) => s + 1);
    setTyped("");
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-col items-center gap-2 bg-navy-900 px-4 py-5 text-center">
        <MissionLabel keyword="NEW">소리(아날로그)를 숫자(디지털)로 바꿔 봐요!</MissionLabel>
        <p className="font-pixel text-small text-sky-100">
          ① 표본화: 세로 점선마다 곡선 높이를 재요 → ② 양자화: 가장 가까운 칸 번호(0~{levels - 1})로 → ③ 부호화: 이진수로 저장
        </p>
      </div>

      <RetroWindow title="아날로그 → 디지털 변환기">
        <div className="flex flex-wrap items-center gap-2 font-pixel text-body">
          <span>점 개수(표본화)</span>
          {([8, 12, 16] as const).map((n) => (
            <button key={n} type="button" onClick={() => next({ samples: n })} className={`h-9 px-3 ${setup.samples === n ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}>
              {n}개
            </button>
          ))}
          <span className="ml-3">높이 칸(양자화)</span>
          {([2, 3] as const).map((b) => (
            <button key={b} type="button" onClick={() => next({ bits: b })} className={`h-9 px-3 ${setup.bits === b ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}>
              {b}비트 (0~{2 ** b - 1})
            </button>
          ))}
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full max-w-[640px] border-3 border-navy-900 bg-paper" role="img" aria-label="소리 곡선과 내가 바꾼 디지털 신호">
          {Array.from({ length: levels }, (_, k) => (
            <g key={k}>
              <line x1={PAD} x2={W - PAD} y1={py(k / (levels - 1))} y2={py(k / (levels - 1))} stroke="#c9d6e8" strokeWidth={1} />
              <text x={6} y={py(k / (levels - 1)) + 4} fontSize={11} fill="#22243a">
                {k}
              </text>
            </g>
          ))}
          {xs.map((t, i) => (
            <line key={i} x1={px(t)} x2={px(t)} y1={PAD} y2={H - PAD} stroke="#3b6fe0" strokeDasharray="3 3" strokeWidth={1} opacity={0.6} />
          ))}
          <path d={analogPath} fill="none" stroke="#3b6fe0" strokeWidth={3} />
          {values.length > 0 && <path d={stepPath} fill="none" stroke="#ff3b6b" strokeWidth={3} />}
          {values.map((v, i) => (
            <circle key={i} cx={px(xs[i])} cy={py(v / (levels - 1))} r={4} fill={v === answer[i] ? "#5bbf3a" : "#ff3b6b"} />
          ))}
        </svg>
        <p className="mt-1 font-pixel text-small text-text-muted">파란 곡선 = 아날로그 소리 · 빨간 계단 = 내가 만든 디지털 신호</p>

        <label className="mt-3 flex flex-col gap-1 font-pixel text-body">
          <span>
            왼쪽 점선부터 차례대로 가장 가까운 칸 번호를 쳐요 ({values.length}/{setup.samples})
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder={`예: ${answer.map(() => "0").join(" ")}`}
            className="win-bevel-pressed h-12 bg-surface px-3 font-typing text-typing tracking-widest outline-none"
          />
        </label>

        {done && (
          <div className="mt-3 flex flex-col gap-2 font-pixel text-body text-navy-900">
            <p className="title-lime text-title">
              {correct}/{setup.samples} 정확!
            </p>
            <p>
              이진수로 저장하면:{" "}
              <span className="font-typing tracking-wider">{values.map((v) => v.toString(2).padStart(setup.bits, "0")).join(" ")}</span> ·{" "}
              {setup.samples * setup.bits}비트
            </p>
            {correct < setup.samples && (
              <p className="text-small">
                정답: <span className="font-typing">{answer.join(" ")}</span>
              </p>
            )}
            <p className="text-small text-text-muted">
              점(표본)을 늘리고 칸(비트)을 늘릴수록 빨간 계단이 파란 곡선에 가까워져요. 대신 저장할 비트가 늘어나요!
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <PixelButton size="sm" variant="ghost" onClick={() => listen(false)}>
            🔊 아날로그 소리
          </PixelButton>
          <PixelButton size="sm" variant="ghost" onClick={() => listen(true)} disabled={!done}>
            🔊 내 디지털 소리
          </PixelButton>
          <PixelButton size="sm" variant="success" onClick={() => next()}>
            다음 소리 ▶
          </PixelButton>
        </div>
      </RetroWindow>
    </div>
  );
}
