"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { GAMES } from "@/config/game";
import { RainHelp } from "@/components/help/HelpContent";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BUNNY } from "@/components/pixel/sprites";
import { fallMs, rainStage, spawnMs, startsLike, type RainEvent } from "@/lib/games/rain";
import { countKeystrokes, isHangul } from "@/lib/typing/hangul";
import { SoloGameFlow, type FieldProps } from "../SoloGameFlow";

const RAIN = GAMES.rain;
const FIELD_H = 420;
const GROUND_H = 36;
const WORD_H = 40;

type Falling = { i: number; text: string; x: number; spawnAt: number; fall: number };
type Pop = { id: number; text: string; x: number; y: number; at: number };

/** 한 프레임 화면에 그릴 값 */
type View = { t: number; active: Falling[]; pops: Pop[]; hits: number; misses: number; combo: number; score: number };
const EMPTY_VIEW: View = { t: 0, active: [], pops: [], hits: 0, misses: 0, combo: 0, score: 0 };

const IGNORED_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "HangulMode", "Lang1", "Escape", "Tab"]);

/* ───────── 게임 판 ───────── */

function Field({ words, track, onEnd }: FieldProps) {
  const [view, setView] = useState<View>(EMPTY_VIEW);
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const composing = useRef(false);
  const submitAfterCompose = useRef(false);

  // 게임 상태는 매 프레임 바뀌므로 ref에 두고, 화면은 프레임마다 다시 그림
  const g = useRef({
    start: 0,
    lastSpawn: -1e9,
    next: 0,
    active: [] as Falling[],
    pops: [] as Pop[],
    events: [] as RainEvent[],
    keyTimes: [] as number[],
    hits: 0,
    misses: 0,
    combo: 0,
    score: 0,
    ended: false,
    popId: 0,
  });

  const now = () => performance.now() - g.current.start;

  useEffect(() => {
    const s = g.current;
    s.start = performance.now();
    let raf = 0;
    const loop = () => {
      const t = now();
      const stage = rainStage(s.hits);

      // 새 단어
      if (t - s.lastSpawn >= spawnMs(stage) && s.active.length < RAIN.maxOnScreen && s.next < words.length) {
        const text = words[s.next];
        s.active.push({ i: s.next, text, x: 0.04 + Math.random() * 0.72, spawnAt: t, fall: fallMs(stage, text) });
        s.next++;
        s.lastSpawn = t;
      }

      // 바닥에 닿은 단어
      for (const w of [...s.active]) {
        if ((t - w.spawnAt) / w.fall >= 1) {
          s.active = s.active.filter((a) => a !== w);
          s.events.push({ t: Math.round(t), type: "miss", i: w.i });
          s.misses++;
          s.combo = 0;
        }
      }
      s.pops = s.pops.filter((p) => t - p.at < 700);

      const reason = s.misses >= RAIN.hearts ? "hearts" : t >= RAIN.maxSeconds * 1000 ? "time" : null;
      if (reason && !s.ended) {
        s.ended = true;
        onEnd({ events: s.events, durationMs: Math.round(t), keyTimes: s.keyTimes, reason });
        return;
      }
      setView({ t, active: [...s.active], pops: [...s.pops], hits: s.hits, misses: s.misses, combo: s.combo, score: s.score });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // 한 판 동안 한 번만 시작
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (raw: string) => {
    const s = g.current;
    const text = raw.trim();
    setValue("");
    if (!text || s.ended) return;
    const t = now();
    // 같은 단어가 여러 개면 바닥에 가장 가까운 것부터
    const target = s.active
      .filter((w) => w.text === text)
      .sort((a, b) => (t - b.spawnAt) / b.fall - (t - a.spawnAt) / a.fall)[0];
    if (!target) {
      s.events.push({ t: Math.round(t), type: "wrong" });
      s.combo = 0;
      setShake((n) => n + 1);
      return;
    }
    const mult = 1 + Math.floor(s.combo / RAIN.comboStep) * RAIN.comboBonus;
    const gained = Math.round(countKeystrokes(text) * 10 * mult);
    s.active = s.active.filter((w) => w !== target);
    s.events.push({ t: Math.round(t), type: "hit", i: target.i });
    s.hits++;
    s.combo++;
    s.score += gained;
    const y = ((t - target.spawnAt) / target.fall) * (FIELD_H - GROUND_H - WORD_H);
    s.pops.push({ id: s.popId++, text: `+${gained}`, x: target.x, y, at: t });
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent;
    if (native.inputType === "insertFromPaste" || native.inputType === "insertFromDrop") return;
    composing.current = native.isComposing ?? composing.current;
    const v = e.target.value;
    // 한글·영타는 Space로도 보낼 수 있음 (기호·코드 단어에는 띄어쓰기가 있어서 Enter만)
    if ((track === "korean" || track === "english") && v.endsWith(" ")) return submit(v);
    setValue(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!IGNORED_KEYS.has(e.key)) g.current.keyTimes.push(Math.round(now()));
    if (e.key !== "Enter") return;
    e.preventDefault();
    // 한글 조합 중에 Enter: 조합이 끝난 뒤 보냄
    if (e.nativeEvent.isComposing) submitAfterCompose.current = true;
    else submit(e.currentTarget.value);
  };

  const s = view;
  const t = view.t;
  const stage = rainStage(s.hits);
  const hearts = Math.max(0, RAIN.hearts - s.misses);
  const left = Math.max(0, RAIN.maxSeconds - Math.floor(t / 1000));
  const imeWrong =
    (track === "korean" && /[a-zA-Z]/.test(value)) || (track === "english" && [...value].some((ch) => isHangul(ch)));

  return (
    <div className="flex flex-col gap-2">
      {/* 위쪽 상태 */}
      <div className="flex items-center justify-between gap-2 font-pixel text-body">
        <span className="win-bevel-pressed bg-paper px-3 py-1">
          점수 <strong className="font-title text-heading">{s.score}</strong>
        </span>
        <span className="win-bevel-pressed bg-paper px-3 py-1">단계 {stage}</span>
        <span className="win-bevel-pressed bg-paper px-3 py-1">
          콤보 <strong>{s.combo}</strong>
        </span>
        <span className="win-bevel-pressed bg-paper px-3 py-1 text-red-500" aria-label={`하트 ${hearts}개`}>
          {"♥".repeat(hearts)}
          <span className="text-win-shadow">{"♥".repeat(RAIN.hearts - hearts)}</span>
        </span>
        <span className="win-bevel-pressed bg-paper px-3 py-1">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </span>
      </div>

      {/* 단어가 떨어지는 하늘 */}
      <div
        className="relative overflow-hidden border-3 border-navy-900"
        style={{
          height: FIELD_H,
          background: "linear-gradient(to bottom, var(--sky-500) 0 30%, #5cbcf7 30% 60%, #78d3f0 60% 85%, var(--mint-300) 85% 100%)",
        }}
      >
        {s.active.map((w) => {
          const y = Math.min(1, (t - w.spawnAt) / w.fall) * (FIELD_H - GROUND_H - WORD_H);
          const near = y > (FIELD_H - GROUND_H - WORD_H) * 0.75;
          const match = startsLike(w.text, value, isComposing);
          return (
            <span
              key={w.i}
              className={`absolute whitespace-pre border-3 px-2 font-typing text-heading leading-[34px] ${
                match ? "border-navy-900 bg-lime-200" : near ? "border-red-500 bg-paper" : "border-navy-900 bg-paper"
              } text-navy-900`}
              style={{ left: `${w.x * 100}%`, top: y }}
            >
              {w.text}
            </span>
          );
        })}
        {s.pops.map((p) => (
          <span
            key={p.id}
            aria-hidden
            className="title-lime pointer-events-none absolute text-heading"
            style={{ left: `${p.x * 100}%`, top: p.y - ((t - p.at) / 700) * 30 }}
          >
            {p.text}
          </span>
        ))}
        <div className="absolute inset-x-0 bottom-0 flex items-end bg-lime-600" style={{ height: GROUND_H }}>
          <PixelSprite sprite={BUNNY} scale={2} className="mb-1 ml-4" />
        </div>
      </div>

      {/* 입력 */}
      <input
        key={shake}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onCompositionStart={() => {
          composing.current = true;
          setIsComposing(true);
        }}
        onCompositionEnd={(e) => {
          composing.current = false;
          setIsComposing(false);
          if (submitAfterCompose.current) {
            submitAfterCompose.current = false;
            submit(e.currentTarget.value);
          }
        }}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        aria-label="떨어지는 단어를 치고 Enter"
        placeholder="떨어지는 단어를 치고 Enter"
        className={`h-14 w-full border-3 border-navy-900 bg-surface px-4 font-typing text-typing outline-none ${shake ? "animate-[shake_200ms_steps(2)]" : ""}`}
      />
      <p className="min-h-6 font-pixel text-small text-navy-900">
        {imeWrong
          ? "한/영 키를 확인하세요!"
          : track === "korean" || track === "english"
            ? "Space나 Enter로 터뜨려요. 같은 단어가 여러 개면 아래쪽부터 터져요."
            : "Enter로 터뜨려요. 띄어쓰기까지 똑같이 쳐야 해요."}
      </p>
    </div>
  );
}

/* ───────── 전체 흐름 (공통) ───────── */

export function RainGame() {
  return (
    <SoloGameFlow
      game="rain"
      Field={Field}
      mission="떨어지는 단어를 바닥에 닿기 전에 터뜨려요!"
      rules={[
        `♥ 하트 ${RAIN.hearts}개 · 단어가 바닥에 닿으면 하나씩 줄어요`,
        `${RAIN.hitsPerStage}개 터뜨릴 때마다 단계가 올라가서 더 빨라져요`,
        `연속으로 맞히면 콤보 점수! · 최대 ${Math.floor(RAIN.maxSeconds / 60)}분 ${RAIN.maxSeconds % 60}초`,
      ]}
      help={<RainHelp />}
      loadingText="구름을 모으는 중..."
      hitLabel="터뜨린 단어"
    />
  );
}
