"use client";

import { useMemo, useState } from "react";
import { PACKS } from "@/data/packs";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { getSettings } from "@/lib/settings";

// 영어 받아쓰기: 브라우저가 문장을 읽어 주면 듣고 쳐요 (영타 + 듣기). 기록·코인은 없는 연습이에요.

const ROUND = 8;
const MAX_PLAYS = 3;

type LevelId = "words" | "short" | "long";
const LEVELS: { id: LevelId; label: string; source: number[] }[] = [
  { id: "words", label: "낱말", source: [4] },
  { id: "short", label: "짧은 문장", source: [5] },
  { id: "long", label: "긴 문장", source: [6, 7, 8] },
];
const RATES = [
  { v: 0.7, label: "천천히" },
  { v: 0.9, label: "보통" },
  { v: 1.05, label: "빠르게" },
];

/** 문단은 문장으로 나눠요 */
function sentencesOf(level: LevelId) {
  const src = LEVELS.find((l) => l.id === level)!.source;
  return PACKS.english.levels
    .filter((l) => src.includes(l.level))
    .flatMap((l) => l.items.flatMap((t) => t.split(/(?<!\bMrs?\.)(?<=[.!?]"?)\s+/)))
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

const shuffle = <T,>(a: T[]) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** 비교할 때는 대소문자·문장부호·띄어쓰기 여러 칸은 너그럽게 */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();

export function Dictation() {
  const [level, setLevel] = useState<LevelId | null>(null);
  const [rate, setRate] = useState(0.9);
  const [seed, setSeed] = useState(0);
  const list = useMemo(() => (level ? shuffle(sentencesOf(level)).slice(0, ROUND) : []), [level, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const [plays, setPlays] = useState(0);
  const [checked, setChecked] = useState<null | { ok: boolean }>(null);
  const [score, setScore] = useState(0);
  const voiceOk = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = (text: string) => {
    if (!voiceOk || plays >= MAX_PLAYS) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    u.volume = Math.max(0.2, getSettings().volume / 100);
    window.speechSynthesis.speak(u);
    setPlays((n) => n + 1);
  };

  if (!level) {
    return (
      <RetroWindow title="영어 받아쓰기" className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-4 text-center font-pixel text-body">
          <MissionLabel keyword="NEW">잘 듣고 그대로 쳐요!</MissionLabel>
          <p>
            🔊 문장을 들려줄게요. 한 문장에 {MAX_PLAYS}번까지 들을 수 있어요. 대문자·문장부호는 틀려도 괜찮아요. 이어폰을 꼈는지 확인해 주세요!
          </p>
          {!voiceOk && <p className="text-red-500">이 브라우저는 읽어 주기를 지원하지 않아요. 크롬에서 해 주세요.</p>}
          <div className="flex flex-wrap justify-center gap-2">
            {RATES.map((r) => (
              <button key={r.v} type="button" onClick={() => setRate(r.v)} className={`h-9 px-3 ${rate === r.v ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}>
                {r.label}
              </button>
            ))}
          </div>
          <div className="grid w-full grid-cols-3 gap-2">
            {LEVELS.map((l, k) => (
              <PixelButton key={l.id} variant={k === 0 ? "success" : "ghost"} autoFocus={k === 0} onClick={() => setLevel(l.id)} disabled={!voiceOk}>
                {l.label}
              </PixelButton>
            ))}
          </div>
        </div>
      </RetroWindow>
    );
  }

  const sentence = list[i];
  if (!sentence) {
    return (
      <RetroWindow title="받아쓰기 끝!" className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-3 text-center font-pixel text-body">
          <p className="title-lime text-hero">
            {score} / {list.length}
          </p>
          <p>{score === list.length ? "모두 맞혔다! 귀가 아주 밝아요!" : "다음엔 더! 천천히 듣기로도 해 봐요."}</p>
          <div className="flex gap-2">
            <PixelButton
              variant="success"
              autoFocus
              onClick={() => {
                setSeed((s) => s + 1);
                setI(0);
                setScore(0);
                setTyped("");
                setPlays(0);
                setChecked(null);
              }}
            >
              ↻ 한 번 더
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setLevel(null)}>
              난이도 바꾸기
            </PixelButton>
          </div>
        </div>
      </RetroWindow>
    );
  }

  const check = () => {
    if (checked) {
      setI(i + 1);
      setTyped("");
      setPlays(0);
      setChecked(null);
      return;
    }
    const ok = norm(typed) === norm(sentence);
    if (ok) setScore((s) => s + 1);
    setChecked({ ok });
  };

  // 단어별로 맞았는지 표시
  const got = norm(typed).split(" ");

  return (
    <RetroWindow title={`영어 받아쓰기 ${i + 1} / ${list.length}`} className="mx-auto w-full max-w-2xl">
      <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
        <div className="flex items-center gap-2">
          <PixelButton variant="reward" onClick={() => speak(sentence)} disabled={plays >= MAX_PLAYS || !!checked}>
            🔊 듣기 ({MAX_PLAYS - plays}번 남음)
          </PixelButton>
          <span className="text-small text-text-muted">맞힌 문장 {score}개</span>
        </div>
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              check();
            }
          }}
          onPaste={(e) => e.preventDefault()}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          disabled={!!checked}
          placeholder="들은 문장을 치고 Enter"
          className="win-bevel-pressed h-14 bg-surface px-3 font-typing text-typing outline-none"
        />
        {checked && (
          <div className={`border-3 border-navy-900 px-3 py-2 ${checked.ok ? "bg-lime-200" : "bg-paper"}`}>
            <p className="font-bold">{checked.ok ? "정답!" : "아쉬워요! 정답은:"}</p>
            <p className="font-typing text-body">
              {sentence.split(" ").map((w, k) => (
                <span key={k} className={norm(w) && !got.includes(norm(w)) ? "text-red-500 underline decoration-2" : ""}>
                  {w}{" "}
                </span>
              ))}
            </p>
          </div>
        )}
        <PixelButton key={checked ? "next" : "check"} variant="success" autoFocus={!!checked} onClick={check} disabled={!checked && !typed.trim()}>
          {checked ? "다음 문장 ▶ (Enter)" : "확인 (Enter)"}
        </PixelButton>
      </div>
    </RetroWindow>
  );
}
