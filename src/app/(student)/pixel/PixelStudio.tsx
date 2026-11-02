"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PIXEL_PALETTES, PIXEL_SIZE, PIXEL_TEMPLATES, validPixelRows, type PixelTemplate } from "@/config/pixel";
import { savePixel } from "@/app/(student)/actions";
import { PixelGrid } from "@/components/pixel/PixelGrid";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TypingSession } from "@/components/typing/TypingSession";
import { safeCall } from "@/lib/practice/call";

const EMPTY = Array.from({ length: PIXEL_SIZE }, () => "");

/** 0과 1로 그리는 픽셀 아트: 따라 치기 / 자유 그리기 → 우리 반 갤러리에 걸기 */
export function PixelStudio() {
  const [tab, setTab] = useState<"follow" | "free">("follow");
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-col items-center gap-2 bg-navy-900 px-4 py-5 text-center">
        <MissionLabel keyword="NEW">컴퓨터는 그림도 0과 1로 기억해요!</MissionLabel>
        <p className="font-pixel text-small text-sky-100">
          한 칸 = 한 픽셀. 1비트는 0·1 두 가지 색, 2비트는 0~3 네 가지 색이에요. 비트가 늘면 표현할 수 있는 색이 두 배씩 늘어나요.
        </p>
      </div>
      <div className="flex justify-center gap-2">
        {(
          [
            ["follow", "✍️ 따라 치기"],
            ["free", "🎨 자유 그리기"],
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
      {tab === "follow" ? <Follow /> : <Free />}
    </div>
  );
}

/** 따라 치기: 그림의 숫자 코드를 한 줄씩 치면 그림이 나타나요 */
function Follow() {
  const [picked, setPicked] = useState<PixelTemplate | null>(null);
  const [done, setDone] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!picked) {
    return (
      <RetroWindow title="어떤 그림을 따라 칠까요?">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {PIXEL_TEMPLATES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setPicked(t);
                  setDone(0);
                  setFinished(false);
                }}
                className="win-bevel flex w-full flex-col items-center gap-2 p-3 active:win-bevel-pressed"
              >
                <PixelGrid rows={t.rows} bits={t.bits} cell={6} label={t.name} />
                <span className="font-pixel text-body">
                  {t.name} · {t.bits}비트
                </span>
              </button>
            </li>
          ))}
        </ul>
      </RetroWindow>
    );
  }

  // 친 글자 수로 몇 줄째까지 쳤는지 → 그만큼 그림을 보여 줘요
  const shown = picked.rows.map((r, y) => r.slice(0, Math.max(0, Math.min(PIXEL_SIZE, done - y * PIXEL_SIZE))));
  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <RetroWindow title={`${picked.name} (${picked.bits}비트)`}>
        <div className="flex flex-col items-center gap-2">
          <PixelGrid rows={finished ? picked.rows : shown} bits={picked.bits} cell={14} ghost={picked.rows} />
          <Legend bits={picked.bits} />
          {finished && <p className="font-title text-heading text-lime-800">그림 완성!</p>}
          <PixelButton size="sm" variant="ghost" onClick={() => setPicked(null)}>
            다른 그림
          </PixelButton>
        </div>
      </RetroWindow>
      <RetroWindow title="숫자 코드 치기">
        <TypingSession
          key={picked.id}
          lines={picked.rows}
          track="english"
          code
          onProgress={(chars) => setDone(chars)}
          onFinish={() => setFinished(true)}
        />
      </RetroWindow>
    </div>
  );
}

/** 자유 그리기: 16줄에 숫자를 직접 써서 그림을 만들어요 */
function Free() {
  const router = useRouter();
  const [bits, setBits] = useState<1 | 2>(1);
  const [rows, setRows] = useState<string[]>(EMPTY);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const allowed = bits === 1 ? /[^01]/g : /[^0-3]/g;
  const ok = validPixelRows(rows, bits);

  const save = async () => {
    setBusy(true);
    const res = await safeCall(() => savePixel({ title, bits, rows }));
    setBusy(false);
    if ("error" in res) return setMsg(res.error);
    setMsg("우리 반 갤러리에 그림을 걸었다!");
    router.refresh();
  };

  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr]">
      <RetroWindow title="미리보기">
        <div className="flex flex-col items-center gap-2">
          <PixelGrid rows={rows} bits={bits} cell={14} />
          <Legend bits={bits} />
        </div>
      </RetroWindow>
      <RetroWindow title="숫자로 그리기">
        <div className="flex flex-col gap-3 font-pixel text-body">
          <div className="flex flex-wrap items-center gap-2">
            {([1, 2] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setBits(b);
                  if (b === 1) setRows(rows.map((r) => r.replace(/[23]/g, "1")));
                }}
                className={`h-9 px-3 ${bits === b ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
              >
                {b}비트 ({b === 1 ? "0·1" : "0~3"})
              </button>
            ))}
            <button type="button" onClick={() => setRows(EMPTY.map(() => "0".repeat(PIXEL_SIZE)))} className="win-bevel h-9 px-3">
              0으로 채우기
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {rows.map((r, y) => (
              <label key={y} className="flex items-center gap-2">
                <span className="w-6 text-right text-small text-text-muted">{y + 1}</span>
                <input
                  value={r}
                  onChange={(e) => {
                    const next = [...rows];
                    next[y] = e.target.value.replace(allowed, "").slice(0, PIXEL_SIZE);
                    setRows(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || (e.key === "ArrowDown" && y < PIXEL_SIZE - 1)) {
                      e.preventDefault();
                      (document.getElementById(`pixel-row-${y + 1}`) as HTMLInputElement | null)?.focus();
                    }
                    if (e.key === "ArrowUp" && y > 0) (document.getElementById(`pixel-row-${y - 1}`) as HTMLInputElement | null)?.focus();
                  }}
                  id={`pixel-row-${y}`}
                  maxLength={PIXEL_SIZE}
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="0000000000000000"
                  className={`win-bevel-pressed h-7 w-64 bg-paper px-2 font-typing tracking-widest outline-none ${r.length === PIXEL_SIZE ? "" : "text-red-500"}`}
                />
                <span className="text-small text-text-muted">{r.length}/16</span>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={20}
              placeholder="그림 제목"
              className="win-bevel-pressed h-10 bg-paper px-2 outline-none"
            />
            <PixelButton variant="success" disabled={!ok || busy} onClick={save}>
              🖼️ 우리 반 갤러리에 걸기
            </PixelButton>
          </div>
          {!ok && <p className="text-small text-text-muted">16줄 모두 숫자 16개씩 채우면 걸 수 있어요.</p>}
          {msg && <DialogBox key={msg} text={msg} />}
        </div>
      </RetroWindow>
    </div>
  );
}

function Legend({ bits }: { bits: 1 | 2 }) {
  return (
    <div className="flex gap-2 font-pixel text-small">
      {PIXEL_PALETTES[bits].map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="inline-block size-4 border-2 border-navy-900" style={{ background: c }} />
          {i}
          {bits === 2 && <span className="text-text-muted">({i.toString(2).padStart(2, "0")})</span>}
        </span>
      ))}
    </div>
  );
}
