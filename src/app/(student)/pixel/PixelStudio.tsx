"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { codeOf, PIXEL_PALETTES, PIXEL_PUZZLES, PIXEL_SIZE, PUZZLE_SIZE, validPixelRows, type PixelBits, type PixelPuzzle } from "@/config/pixel";
import { savePixel } from "@/app/(student)/actions";
import { PixelGrid } from "@/components/pixel/PixelGrid";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";

// 이진 코드로 비트맵 그리기 (선생님 활동지):
//  · 코드 → 그림 (해독): 이진 코드를 보고 칸을 색칠해요
//  · 그림 → 코드 (부호화): 칸을 색칠하면 이진 코드가 저절로 만들어져요

const blank = (size: number) => Array.from({ length: size }, () => "0".repeat(size));
const paint = (rows: string[], x: number, y: number, n: number) =>
  rows.map((r, k) => (k === y ? r.slice(0, x) + n.toString(16) + r.slice(x + 1) : r));

export function PixelStudio() {
  const [tab, setTab] = useState<"decode" | "encode">("decode");
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-col items-center gap-2 bg-navy-900 px-4 py-5 text-center">
        <MissionLabel keyword="NEW">컴퓨터는 그림도 0과 1로 기억해요!</MissionLabel>
      </div>
      <BitmapIntro />
      <div className="flex flex-wrap justify-center gap-2">
        {(
          [
            ["decode", "🔍 코드 → 그림 (해독)"],
            ["encode", "🎨 그림 → 코드 (부호화)"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`h-10 px-4 font-pixel text-body text-navy-900 ${tab === id ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
          >
            {label}
          </button>
        ))}
        <PixelLink href="/room" variant="ghost">
          우리 반 갤러리
        </PixelLink>
      </div>
      {tab === "decode" ? <Decode /> : <Encode />}
    </div>
  );
}

/** 예시 한 줄: 이진 코드를 비트 수만큼 끊고, 그 아래에 칸 색을 보여 줘요 */
function ExampleRow({ bits, colors }: { bits: PixelBits; colors: number[] }) {
  return (
    <div className="flex flex-wrap items-end gap-1">
      {colors.map((n, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <span className="border-2 border-navy-900 bg-surface px-1 font-typing text-small">{codeOf(n, bits)}</span>
          <span className="text-small" aria-hidden>
            ↓
          </span>
          <span className="inline-block size-7 border-2 border-navy-900" style={{ background: PIXEL_PALETTES[bits][n] }} />
        </div>
      ))}
    </div>
  );
}

/** 비트맵이란? (맨 위 설명) */
function BitmapIntro() {
  return (
    <RetroWindow title="📖 비트맵 이미지란?">
      <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
        <p>
          그림을 아주 작은 네모 칸(<strong>픽셀</strong>)으로 나누고, 칸마다 <strong>색 번호를 이진수로</strong> 적어 두는 방법이에요. 컴퓨터 화면의 사진도
          가까이 보면 이런 작은 칸들이에요.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="border-3 border-navy-900 bg-paper p-2">
            <p className="mb-1 font-bold">1비트 = 2가지 색</p>
            <p className="mb-2 text-small">한 칸에 0 또는 1. 0은 흰색, 1은 검은색.</p>
            <ExampleRow bits={1} colors={[0, 1, 1, 0]} />
            <p className="mt-1 text-small text-text-muted">코드 0110 → □■■□</p>
          </div>
          <div className="border-3 border-navy-900 bg-paper p-2">
            <p className="mb-1 font-bold">2비트 = 4가지 색</p>
            <p className="mb-2 text-small">한 칸에 2자리씩: 00, 01, 10, 11</p>
            <ExampleRow bits={2} colors={[0, 3, 1, 2]} />
            <p className="mt-1 text-small text-text-muted">코드 00110110 → 2자리씩 끊어 읽어요</p>
          </div>
          <div className="border-3 border-navy-900 bg-paper p-2">
            <p className="mb-1 font-bold">4비트 = 16가지 색</p>
            <p className="mb-2 text-small">한 칸에 4자리씩: 0000 ~ 1111</p>
            <ExampleRow bits={4} colors={[10, 11, 12, 9]} />
            <p className="mt-1 text-small text-text-muted">비트가 1개 늘 때마다 색이 2배!</p>
          </div>
        </div>
        <p className="border-l-4 border-navy-900 bg-paper px-3 py-2 text-small">
          💡 색이 많을수록 그림은 예뻐지지만 저장할 비트가 늘어나요. 8×8 그림이면 1비트는 64비트, 4비트는 256비트가 필요해요.
        </p>
      </div>
    </RetroWindow>
  );
}

/** 단계별 방법 상자 */
function HowTo({ steps }: { steps: string[] }) {
  return (
    <ol className="mb-3 flex flex-col gap-1 border-3 border-dashed border-navy-900 bg-paper px-3 py-2 font-pixel text-small text-navy-900">
      <li className="font-bold">이렇게 해요</li>
      {steps.map((s, i) => (
        <li key={i} className="flex gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center bg-navy-900 text-paper">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/** 색표: 색 번호 + 이진 코드. 누르면 그 색으로 칠해요 */
function Palette({ bits, color, onPick }: { bits: PixelBits; color: number; onPick: (n: number) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 font-pixel text-small sm:grid-cols-4">
      {PIXEL_PALETTES[bits].map((c, n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          className={`flex items-center gap-1 border-2 px-1 py-0.5 ${color === n ? "border-navy-900 bg-yellow-400 font-bold" : "border-transparent"}`}
        >
          <span className="inline-block size-5 shrink-0 border-2 border-navy-900" style={{ background: c }} />
          <span className="font-typing">{codeOf(n, bits)}</span>
          <span className="text-text-muted">({n})</span>
        </button>
      ))}
    </div>
  );
}

/** 이진 코드 표: 줄마다 칸의 색 코드를 띄어서 */
function CodeTable({ rows, bits }: { rows: string[]; bits: PixelBits }) {
  return (
    <ol className="font-typing text-small leading-6 text-navy-900">
      {rows.map((r, y) => (
        <li key={y} className="whitespace-nowrap">
          <span className="mr-2 inline-block w-5 text-right text-text-muted">{y + 1}</span>
          {[...r].map((ch) => codeOf(parseInt(ch, 16), bits)).join(" ")}
        </li>
      ))}
    </ol>
  );
}

/** 해독: 이진 코드를 보고 8×8 칸을 색칠, "확인"으로 맞았는지 */
function Decode() {
  const [puzzle, setPuzzle] = useState<PixelPuzzle | null>(null);
  const [rows, setRows] = useState<string[]>(blank(PUZZLE_SIZE));
  const [color, setColor] = useState(1);
  const [wrong, setWrong] = useState<Set<string> | null>(null);

  if (!puzzle) {
    return (
      <RetroWindow title="어떤 코드를 그림으로 바꿔 볼까요?">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {PIXEL_PUZZLES.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setPuzzle(p);
                  setRows(blank(PUZZLE_SIZE));
                  setColor(1);
                  setWrong(null);
                }}
                className="win-bevel flex w-full flex-col items-center gap-1 p-3 font-pixel text-body active:win-bevel-pressed"
              >
                <span className="text-heading">문제 {i + 1}</span>
                <span>
                  {p.bits}비트 · {2 ** p.bits}가지 색
                </span>
                <span className="text-small text-text-muted">무엇이 나올까요?</span>
              </button>
            </li>
          ))}
        </ul>
      </RetroWindow>
    );
  }

  const solved = wrong !== null && wrong.size === 0;
  const check = () => {
    const w = new Set<string>();
    puzzle.rows.forEach((r, y) => [...r].forEach((ch, x) => rows[y][x] !== ch && w.add(`${x}-${y}`)));
    setWrong(w);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
      <RetroWindow title={`이진 코드 (${puzzle.bits}비트 · 8×8)`}>
        <HowTo
          steps={[
            `코드 한 줄 = 그림의 한 줄이에요. 1번 줄부터 차례대로 해요.`,
            `띄어 쓴 코드 하나(${puzzle.bits}자리)가 칸 하나예요. 왼쪽 코드부터 왼쪽 칸에 칠해요. (한 줄에 ${PUZZLE_SIZE}칸)`,
            `아래 색표에서 그 코드와 같은 색을 눌러 골라요.`,
            `오른쪽 그림판에서 같은 줄, 같은 순서의 칸을 눌러 칠해요. 같은 색이 이어지면 끌어서 칠해도 돼요.`,
            `다 칠하면 [확인]! 틀린 칸은 빨간 테두리로 알려 줘요.`,
          ]}
        />
        <CodeTable rows={puzzle.rows} bits={puzzle.bits} />
        <div className="mt-3">
          <Palette bits={puzzle.bits} color={color} onPick={setColor} />
        </div>
      </RetroWindow>
      <RetroWindow title={solved ? `정답! ${puzzle.name}` : "그림판 (눌러서 칠하기)"}>
        <div className="flex flex-col items-center gap-2">
          <PixelGrid
            rows={rows}
            bits={puzzle.bits}
            cell={36}
            wrong={wrong ?? undefined}
            onPaint={(x, y) => {
              setRows((r) => paint(r, x, y, color));
              setWrong(null);
            }}
          />
          {wrong && !solved && <p className="font-pixel text-body text-red-500">빨간 칸 {wrong.size}개를 다시 확인해요!</p>}
          {solved && <p className="title-lime text-title">해독 성공! 🎉</p>}
          <div className="flex gap-2">
            <PixelButton variant="success" onClick={check}>
              확인
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setRows(blank(PUZZLE_SIZE))}>
              지우기
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setPuzzle(null)}>
              다른 문제
            </PixelButton>
          </div>
        </div>
      </RetroWindow>
    </div>
  );
}

/** 부호화: 16×16 칸을 칠하면 이진 코드가 만들어지고, 우리 반 갤러리에 걸 수 있어요 */
function Encode() {
  const router = useRouter();
  const [bits, setBits] = useState<PixelBits>(4);
  const [rows, setRows] = useState<string[]>(blank(PIXEL_SIZE));
  const [color, setColor] = useState(8);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const changeBits = (b: PixelBits) => {
    const max = 2 ** b - 1;
    setBits(b);
    setColor(Math.min(color, max));
    // 쓸 수 없는 색 번호는 가장 큰 번호로
    setRows(rows.map((r) => [...r].map((ch) => Math.min(parseInt(ch, 16), max).toString(16)).join("")));
  };

  const save = async () => {
    setBusy(true);
    const res = await safeCall(() => savePixel({ title, bits, rows }));
    setBusy(false);
    if ("error" in res) return setMsg(res.error);
    setMsg("우리 반 갤러리에 그림을 걸었다!");
    router.refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <RetroWindow title="그림판 (눌러서·끌어서 칠하기)">
        <div className="flex flex-col items-center gap-2">
          <PixelGrid rows={rows} bits={bits} cell={22} onPaint={(x, y) => setRows((r) => paint(r, x, y, color))} />
          <div className="flex flex-wrap items-center gap-2 font-pixel text-body">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={20}
              placeholder="그림 제목"
              className="win-bevel-pressed h-10 bg-paper px-2 outline-none"
            />
            <PixelButton variant="success" disabled={busy || !validPixelRows(rows, bits)} onClick={save}>
              🖼️ 갤러리에 걸기
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setRows(blank(PIXEL_SIZE))}>
              지우기
            </PixelButton>
          </div>
          {msg && <DialogBox key={msg} text={msg} />}
        </div>
      </RetroWindow>
      <RetroWindow title="색표와 이진 코드">
        <div className="flex flex-col gap-3 font-pixel text-body">
          <HowTo
            steps={[
              "몇 비트로 그릴지 골라요. 1비트는 2색, 2비트는 4색, 4비트는 16색이에요.",
              "색표에서 칠할 색을 눌러 골라요. 색마다 이진 코드가 붙어 있어요.",
              "왼쪽 그림판 칸을 누르거나 끌어서 칠해요.",
              "칠할 때마다 아래 '이진 코드'가 바뀌어요. 컴퓨터는 그림을 이 코드로 저장해요!",
              "제목을 쓰고 [갤러리에 걸기]를 누르면 우리 반 갤러리에 걸려요.",
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {([1, 2, 4] as const).map((b) => (
              <button key={b} type="button" onClick={() => changeBits(b)} className={`h-9 px-3 ${bits === b ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}>
                {b}비트 ({2 ** b}색)
              </button>
            ))}
          </div>
          <Palette bits={bits} color={color} onPick={setColor} />
          <p className="text-small text-text-muted">
            이 그림의 크기: 16 × 16칸 × {bits}비트 = <strong>{16 * 16 * bits}비트</strong> ({(16 * 16 * bits) / 8}바이트). 색이 많을수록 저장할 비트도 늘어나요!
          </p>
          <div className="max-h-80 overflow-auto border-2 border-navy-900 bg-surface p-2">
            <CodeTable rows={rows} bits={bits} />
          </div>
        </div>
      </RetroWindow>
    </div>
  );
}
