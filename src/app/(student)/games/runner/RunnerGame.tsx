"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { RUNNER } from "@/config/game";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BUNNY, CLOUD } from "@/components/pixel/sprites";
import { startsLike, type RainEvent } from "@/lib/games/rain";
import { countKeystrokes, isHangul } from "@/lib/typing/hangul";
import { SoloGameFlow, type FieldProps } from "../SoloGameFlow";

// 토끼 달리기: 오른쪽에서 다가오는 장애물 단어를 쳐서 점프! 놓치면 부딪혀서 하트가 줄어요.
// 점수 계산(맞힌 단어의 자모 수 × 콤보)은 단어 비와 같아서 서버가 같은 방법으로 다시 계산해요.

const FIELD_H = 300;
const GROUND_H = 56;
/** 토끼 위치 (화면 왼쪽에서 %) */
const BUNNY_X = 8;
const COMBO_STEP = 5;
const COMBO_BONUS = 0.5;

const stageOf = (hits: number) => 1 + Math.floor(hits / RUNNER.hitsPerStage);
const approachMs = (stage: number, word: string) =>
  Math.max(RUNNER.approachSeconds.min, RUNNER.approachSeconds.start - (stage - 1) * RUNNER.approachSeconds.perStage) *
  1000 *
  (1 + Math.max(0, word.length - 6) / 20);
const gapMs = (stage: number) =>
  Math.max(RUNNER.gapSeconds.min, RUNNER.gapSeconds.start - (stage - 1) * RUNNER.gapSeconds.perStage) * 1000;

type Obstacle = { i: number; text: string; spawnAt: number; approach: number };
type Pop = { id: number; text: string; x: number; at: number };
type View = {
  t: number;
  active: Obstacle[];
  pops: Pop[];
  hits: number;
  misses: number;
  combo: number;
  score: number;
  jumpUntil: number;
  ouchUntil: number;
};
const EMPTY: View = { t: 0, active: [], pops: [], hits: 0, misses: 0, combo: 0, score: 0, jumpUntil: 0, ouchUntil: 0 };

const IGNORED_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "HangulMode", "Lang1", "Escape", "Tab"]);

/** 장애물이 얼마나 다가왔는지 0(오른쪽 끝) ~ 1(토끼) */
const progressOf = (o: Obstacle, t: number) => (t - o.spawnAt) / o.approach;
const xOf = (p: number) => 100 - p * (100 - BUNNY_X);

function Field({ words, track, onEnd }: FieldProps) {
  const [view, setView] = useState<View>(EMPTY);
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const composing = useRef(false);
  const submitAfterCompose = useRef(false);

  const g = useRef({
    start: 0,
    lastSpawn: -1e9,
    next: 0,
    active: [] as Obstacle[],
    pops: [] as Pop[],
    events: [] as RainEvent[],
    keyTimes: [] as number[],
    hits: 0,
    misses: 0,
    combo: 0,
    score: 0,
    jumpUntil: 0,
    ouchUntil: 0,
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
      const stage = stageOf(s.hits);

      // 새 장애물
      if (t - s.lastSpawn >= gapMs(stage) && s.active.length < 4 && s.next < words.length) {
        const text = words[s.next];
        s.active.push({ i: s.next, text, spawnAt: t, approach: approachMs(stage, text) });
        s.next++;
        s.lastSpawn = t;
      }

      // 토끼와 부딪힘
      for (const o of [...s.active]) {
        if (progressOf(o, t) >= 1) {
          s.active = s.active.filter((a) => a !== o);
          s.events.push({ t: Math.round(t), type: "miss", i: o.i });
          s.misses++;
          s.combo = 0;
          s.ouchUntil = t + 600;
        }
      }
      s.pops = s.pops.filter((p) => t - p.at < 700);

      const reason = s.misses >= RUNNER.hearts ? "hearts" : t >= RUNNER.maxSeconds * 1000 ? "time" : null;
      if (reason && !s.ended) {
        s.ended = true;
        onEnd({ events: s.events, durationMs: Math.round(t), keyTimes: s.keyTimes, reason });
        return;
      }
      setView({
        t,
        active: [...s.active],
        pops: [...s.pops],
        hits: s.hits,
        misses: s.misses,
        combo: s.combo,
        score: s.score,
        jumpUntil: s.jumpUntil,
        ouchUntil: s.ouchUntil,
      });
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
    // 같은 단어가 여럿이면 토끼에 가장 가까운 것부터
    const target = s.active.filter((o) => o.text === text).sort((a, b) => progressOf(b, t) - progressOf(a, t))[0];
    if (!target) {
      s.events.push({ t: Math.round(t), type: "wrong" });
      s.combo = 0;
      setShake((n) => n + 1);
      return;
    }
    const mult = 1 + Math.floor(s.combo / COMBO_STEP) * COMBO_BONUS;
    const gained = Math.round(countKeystrokes(text) * 10 * mult);
    s.active = s.active.filter((o) => o !== target);
    s.events.push({ t: Math.round(t), type: "hit", i: target.i });
    s.hits++;
    s.combo++;
    s.score += gained;
    s.jumpUntil = t + 500;
    s.pops.push({ id: s.popId++, text: `+${gained}`, x: xOf(progressOf(target, t)), at: t });
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent;
    if (native.inputType === "insertFromPaste" || native.inputType === "insertFromDrop") return;
    composing.current = native.isComposing ?? composing.current;
    const v = e.target.value;
    if ((track === "korean" || track === "english") && v.endsWith(" ")) return submit(v);
    setValue(v);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!IGNORED_KEYS.has(e.key)) g.current.keyTimes.push(Math.round(now()));
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.nativeEvent.isComposing) submitAfterCompose.current = true;
    else submit(e.currentTarget.value);
  };

  const { t } = view;
  const stage = stageOf(view.hits);
  const hearts = Math.max(0, RUNNER.hearts - view.misses);
  const left = Math.max(0, RUNNER.maxSeconds - Math.floor(t / 1000));
  const meters = Math.floor((t / 1000) * (4 + stage));
  // 점프: 0.5초 동안 위로 올라갔다 내려옴 (뚝뚝 끊기게 4px 단위)
  const jumpLeft = view.jumpUntil - t;
  const jumpY = jumpLeft > 0 ? Math.round((Math.sin((1 - jumpLeft / 500) * Math.PI) * 72) / 4) * 4 : 0;
  const ouch = view.ouchUntil > t;
  const imeWrong =
    (track === "korean" && /[a-zA-Z]/.test(value)) || (track === "english" && [...value].some((ch) => isHangul(ch)));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 font-pixel text-body">
        <span className="win-bevel-pressed bg-paper px-3 py-1">
          점수 <strong className="font-title text-heading">{view.score}</strong>
        </span>
        <span className="win-bevel-pressed bg-paper px-3 py-1">{meters}m</span>
        <span className="win-bevel-pressed bg-paper px-3 py-1">속도 {stage}</span>
        <span className="win-bevel-pressed bg-paper px-3 py-1">
          콤보 <strong>{view.combo}</strong>
        </span>
        <span className="win-bevel-pressed bg-paper px-3 py-1 text-red-500" aria-label={`하트 ${hearts}개`}>
          {"♥".repeat(hearts)}
          <span className="text-win-shadow">{"♥".repeat(RUNNER.hearts - hearts)}</span>
        </span>
        <span className="win-bevel-pressed bg-paper px-3 py-1">
          {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </span>
      </div>

      <div
        className="relative overflow-hidden border-3 border-navy-900"
        style={{
          height: FIELD_H,
          background: "linear-gradient(to bottom, var(--sky-500) 0 35%, #5cbcf7 35% 65%, #78d3f0 65% 100%)",
        }}
      >
        {/* 천천히 지나가는 구름 */}
        <PixelSprite sprite={CLOUD} scale={4} className="absolute top-6" style={{ left: `${100 - ((t / 90) % 130)}%` }} />
        <PixelSprite sprite={CLOUD} scale={3} className="absolute top-20" style={{ left: `${100 - ((t / 60 + 60) % 130)}%` }} />

        {/* 땅: 줄무늬가 왼쪽으로 흘러서 달리는 느낌 */}
        <div
          className="absolute inset-x-0 bottom-0 border-t-3 border-navy-900"
          style={{
            height: GROUND_H,
            background: "repeating-linear-gradient(90deg, var(--lime-600) 0 24px, var(--lime-400) 24px 48px)",
            backgroundPosition: `${-((t / 1000) * (60 + stage * 12)) % 48}px 0`,
          }}
        />

        {/* 장애물 단어 */}
        {view.active.map((o) => {
          const p = Math.min(1, progressOf(o, t));
          const match = startsLike(o.text, value, isComposing);
          return (
            <div
              key={o.i}
              className="absolute flex flex-col items-center"
              style={{ left: `${xOf(p)}%`, bottom: GROUND_H - 3, transform: "translateX(-10%)" }}
            >
              <span
                className={`whitespace-pre border-3 border-navy-900 px-2 font-typing text-heading leading-[34px] text-navy-900 ${
                  match ? "bg-lime-200" : p > 0.7 ? "bg-[var(--typing-space-error)]" : "bg-paper"
                }`}
              >
                {o.text}
              </span>
              <span aria-hidden className="h-6 w-6 border-3 border-navy-900 bg-road" />
            </div>
          );
        })}

        {view.pops.map((p) => (
          <span
            key={p.id}
            aria-hidden
            className="title-lime pointer-events-none absolute text-heading"
            style={{ left: `${p.x}%`, bottom: GROUND_H + 40 + ((t - p.at) / 700) * 30 }}
          >
            {p.text}
          </span>
        ))}

        {/* 내 토끼 */}
        <div className="absolute" style={{ left: `${BUNNY_X - 6}%`, bottom: GROUND_H - 3 + jumpY }}>
          <PixelSprite sprite={BUNNY} scale={4} className={ouch ? "opacity-50" : ""} />
          {ouch && <span className="absolute -top-6 left-2 font-pixel text-body font-bold text-red-500">쿵!</span>}
        </div>
      </div>

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
        aria-label="장애물 단어를 치고 Enter"
        placeholder="다가오는 단어를 치고 Enter → 점프!"
        className={`h-14 w-full border-3 border-navy-900 bg-surface px-4 font-typing text-typing outline-none ${shake ? "animate-[shake_200ms_steps(2)]" : ""}`}
      />
      <p className="min-h-6 font-pixel text-small text-navy-900">
        {imeWrong
          ? "한/영 키를 확인하세요!"
          : track === "korean" || track === "english"
            ? "Space나 Enter로 점프해요. 토끼에 가장 가까운 장애물부터 넘어요."
            : "Enter로 점프해요. 띄어쓰기까지 똑같이 쳐야 해요."}
      </p>
    </div>
  );
}

export function RunnerGame() {
  return (
    <SoloGameFlow
      game="runner"
      Field={Field}
      mission="다가오는 장애물 단어를 쳐서 점프해요!"
      rules={[
        `♥ 하트 ${RUNNER.hearts}개 · 장애물에 부딪히면 하나씩 줄어요`,
        `${RUNNER.hitsPerStage}개 넘을 때마다 더 빨리 달려요`,
        `연속으로 넘으면 콤보 점수! · 최대 ${Math.floor(RUNNER.maxSeconds / 60)}분 ${RUNNER.maxSeconds % 60}초`,
      ]}
      loadingText="운동화 끈을 묶는 중..."
      hitLabel="넘은 장애물"
    />
  );
}
