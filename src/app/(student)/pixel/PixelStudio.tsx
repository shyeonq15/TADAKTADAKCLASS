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
        <p className="font-pixel text-small text-sky-100">
          한 칸 = 한 픽셀. 칸마다 색 번호를 이진수로 저장해요. 1비트는 2가지 색, 2비트는 4가지, 4비트는 16가지 색!
        </p>
      </div>
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
        <p className="mb-2 font-pixel text-small text-text-muted">
          한 줄 = 그림의 한 줄. {puzzle.bits}개씩 끊어 읽으면 칸 하나의 색이에요. 색표에서 그 코드를 찾아 칠해요!
        </p>
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
