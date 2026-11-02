"use client";

import { useState } from "react";
import { BINARY_FIRST_CLEAR_COINS, BINARY_STAGES, type BinaryStage } from "@/config/binary";
import { clearBinaryStage } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import { usePracticeData, useSetPracticeData } from "@/lib/practice/store";

// 이진수 연습실: 선생님 활동지처럼 단계별로 (자릿값 보며 십진수 쓰기 → 비트 눌러 만들기 → 이진수 쓰기)

type Problem = { kind: "toDec" | "flip" | "toBin"; value: number; bits: number };

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const toBits = (v: number, bits: number) => v.toString(2).padStart(bits, "0");
const places = (bits: number) => Array.from({ length: bits }, (_, i) => 2 ** (bits - 1 - i));

/** 단계 문제 만들기: 같은 숫자가 겹치지 않게 */
function makeProblems(st: BinaryStage): Problem[] {
  const max = 2 ** st.bits - 1;
  const used = new Set<number>();
  const out: Problem[] = [];
  for (let i = 0; i < st.count; i++) {
    let v = rand(st.bits >= 8 ? 16 : 1, max);
    while (used.has(v)) v = rand(1, max);
    used.add(v);
    const kind = st.kind === "mixed" ? (i % 2 ? "toBin" : "toDec") : st.kind;
    out.push({ kind, value: v, bits: st.bits });
  }
  return out;
}

export function BinaryLab() {
  const { progress } = usePracticeData();
  const [stage, setStage] = useState<BinaryStage | null>(null);
  const cleared = (n: number) => progress.cleared.includes(`binary-${n}`);
  const open = (n: number) => n === 1 || cleared(n - 1);

  if (!stage) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-col items-center gap-2 bg-navy-900 px-4 py-5 text-center">
          <MissionLabel keyword="NEW">컴퓨터는 0과 1로 숫자를 기억해요!</MissionLabel>
          <p className="font-pixel text-small text-sky-100">
            오른쪽부터 1, 2, 4, 8, 16 … 자릿값이 두 배씩 커져요. 1이 있는 자리의 자릿값을 모두 더하면 십진수가 돼요.
          </p>
        </div>
        <RetroWindow title="이진수 연습실">
          <ol className="grid gap-2 sm:grid-cols-2">
            {BINARY_STAGES.map((s) => (
              <li key={s.n}>
                <button
                  type="button"
                  disabled={!open(s.n)}
                  onClick={() => setStage(s)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left font-pixel text-body text-navy-900 ${
                    cleared(s.n) ? "win-bevel bg-lime-200" : open(s.n) ? "win-bevel bg-yellow-400" : "win-bevel-pressed bg-win-gray text-text-muted"
                  }`}
                >
                  <span className="font-title text-heading">{s.n}단계</span>
                  <span className="flex-1">{s.title}</span>
                  <span>{cleared(s.n) ? "✅" : open(s.n) ? "▶" : "🔒"}</span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-3 font-pixel text-small text-text-muted">
            앞 단계를 깨면 다음 단계가 열려요. 처음 깰 때 코인 {BINARY_FIRST_CLEAR_COINS}개!
          </p>
        </RetroWindow>
      </div>
    );
  }

  return <StageRun key={stage.n} stage={stage} onBack={() => setStage(null)} onNext={(s) => setStage(s)} />;
}

function StageRun({ stage, onBack, onNext }: { stage: BinaryStage; onBack: () => void; onNext: (s: BinaryStage) => void }) {
  const setData = useSetPracticeData();
  const [problems, setProblems] = useState(() => makeProblems(stage));
  const [ok, setOk] = useState<boolean[]>(() => problems.map(() => false));
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const allOk = ok.every(Boolean);
  const next = BINARY_STAGES.find((s) => s.n === stage.n + 1);

  const mark = async (i: number, good: boolean) => {
    if (ok[i] === good) return;
    const nextOk = ok.map((v, k) => (k === i ? good : v));
    setOk(nextOk);
    if (nextOk.every(Boolean) && !saved) {
      setSaved(true);
      const res = await safeCall(() => clearBinaryStage(stage.n));
      if ("error" in res) return setMsg(res.error ?? "");
      setData(res.data);
      setMsg(res.first ? `${stage.n}단계를 처음 깼다! 코인 ${res.coins}개를 획득했다!` : `${stage.n}단계 클리어!`);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <RetroWindow title={`${stage.n}단계 · ${stage.title}`}>
        <p className="mb-3 font-pixel text-body text-navy-900">
          {stage.kind === "toDec" && "이진수를 보고 십진수를 써요."}
          {stage.kind === "flip" && "목표 숫자가 되도록 비트 칸을 눌러 0과 1을 바꿔요."}
          {stage.kind === "toBin" && "십진수를 보고 이진수를 써요. 앞자리 0은 안 써도 돼요."}
          {stage.kind === "mixed" && "십진수 칸, 이진수 칸 모두 채워요!"}
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {problems.map((p, i) => (
            <ProblemCard key={`${i}-${p.value}`} p={p} showPlaces={stage.showPlaces} done={ok[i]} onCheck={(good) => mark(i, good)} />
          ))}
        </div>
      </RetroWindow>
      {allOk && (
        <div className="flex flex-col items-center gap-3">
          <p className="title-lime text-hero">STAGE CLEAR!</p>
          {msg && <DialogBox key={msg} text={msg} />}
        </div>
      )}
      {!allOk && msg && <p className="font-pixel text-body text-red-500">{msg}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        {allOk && next && (
          <PixelButton variant="success" autoFocus onClick={() => onNext(next)}>
            {next.n}단계로 ▶
          </PixelButton>
        )}
        <PixelButton
          variant="ghost"
          onClick={() => {
            const fresh = makeProblems(stage);
            setProblems(fresh);
            setOk(fresh.map(() => false));
            setSaved(false);
            setMsg("");
          }}
        >
          ↻ 새 문제
        </PixelButton>
        <PixelButton variant="ghost" onClick={onBack}>
          단계 목록
        </PixelButton>
      </div>
    </div>
  );
}

/** 자릿값 머리줄 + 비트 칸 */
function BitRow({ bits, value, showPlaces, onFlip }: { bits: number; value: string; showPlaces: boolean; onFlip?: (i: number) => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      {showPlaces && (
        <div className="flex gap-1">
          {places(bits).map((pl) => (
            <span key={pl} className="w-9 text-center font-pixel text-small text-navy-700">
              {pl}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        {[...value].map((b, i) =>
          onFlip ? (
            <button
              key={i}
              type="button"
              onClick={() => onFlip(i)}
              aria-label={`${places(bits)[i]}의 자리: ${b}`}
              className={`flex h-11 w-9 items-center justify-center border-3 border-navy-900 font-typing text-heading ${b === "1" ? "bg-navy-900 text-yellow-400" : "bg-yellow-400 text-navy-900"} active:translate-y-0.5`}
            >
              {b}
            </button>
          ) : (
            <span key={i} className="flex h-11 w-9 items-center justify-center border-3 border-navy-900 bg-paper font-typing text-heading text-navy-900">
              {b}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function ProblemCard({ p, showPlaces, done, onCheck }: { p: Problem; showPlaces: boolean; done: boolean; onCheck: (good: boolean) => void }) {
  const [typed, setTyped] = useState("");
  const [flips, setFlips] = useState("0".repeat(p.bits));
  const box = `flex h-11 items-center justify-center border-3 border-navy-900 font-typing text-heading ${done ? "bg-lime-400" : "bg-yellow-400"}`;

  if (p.kind === "toDec") {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <BitRow bits={p.bits} value={toBits(p.value, p.bits)} showPlaces={showPlaces} />
        <label className="flex flex-col gap-0.5">
          <span className="font-pixel text-small text-navy-700">십진수</span>
          <input
            value={typed}
            inputMode="numeric"
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
              setTyped(v);
              onCheck(v !== "" && Number(v) === p.value);
            }}
            aria-label="십진수 답"
            className={`${box} w-20 text-center outline-none`}
          />
        </label>
      </div>
    );
  }

  // 지금 칸이 나타내는 값 ("내 값")
  const mine = p.kind === "flip" ? parseInt(flips, 2) : typed ? parseInt(typed, 2) : 0;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col items-center">
        <span className="font-pixel text-small text-navy-700">목표</span>
        <span className="flex h-11 w-16 items-center justify-center border-3 border-navy-900 bg-paper font-title text-heading text-navy-900">{p.value}</span>
      </div>
      {p.kind === "flip" ? (
        <BitRow
          bits={p.bits}
          value={flips}
          showPlaces={showPlaces}
          onFlip={(i) => {
            const next = [...flips].map((b, k) => (k === i ? (b === "1" ? "0" : "1") : b)).join("");
            setFlips(next);
            onCheck(parseInt(next, 2) === p.value);
          }}
        />
      ) : (
        <label className="flex flex-col gap-0.5">
          <span className="font-pixel text-small text-navy-700">이진수</span>
          <input
            value={typed}
            onChange={(e) => {
              const v = e.target.value.replace(/[^01]/g, "").slice(0, p.bits);
              setTyped(v);
              onCheck(v !== "" && parseInt(v, 2) === p.value);
            }}
            spellCheck={false}
            aria-label="이진수 답"
            className={`${box} w-40 px-2 text-center tracking-widest outline-none`}
          />
        </label>
      )}
      <div className="flex flex-col items-center">
        <span className="font-pixel text-small text-navy-700">내 값</span>
        <span className={`flex h-11 w-16 items-center justify-center border-3 border-navy-900 font-title text-heading ${done ? "bg-lime-400" : "bg-paper"} text-navy-900`}>
          {mine}
        </span>
      </div>
    </div>
  );
}
