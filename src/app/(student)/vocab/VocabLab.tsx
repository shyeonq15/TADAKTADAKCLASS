"use client";

import { useState } from "react";
import { GAMES } from "@/config/game";
import { VOCAB, VOCAB_CLEAR } from "@/config/vocab";
import { vocabClaimWeek, vocabClear, vocabReviewDone, vocabStatus } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { getSettings } from "@/lib/settings";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import { usePracticeData, useSetPracticeData } from "@/lib/practice/store";
import { getPart, partLabel, partWords, shuffled, VOCAB_PARTS, type VocabWord } from "@/lib/vocab/words";
import type { Notebook, VocabRanks, VocabWeek } from "@/lib/vocab/server";
import type { RankEntry } from "@/lib/rank/people";
import { Field as RainField } from "../games/rain/RainGame";
import { SoloGameFlow } from "../games/SoloGameFlow";
import { VocabQuiz, type QuizMode, type QuizResult } from "./VocabQuiz";

// 영단어 연구소: 영어 선생님 단어 목록(4탄~10탄). 묶음마다 ① 단어장(보고 듣고 따라 치기) → ② 빈칸 채우기 → ③ 듣고 쓰기 → ④ 뜻 비.
// 이번 주 단어 보상, 틀린 단어장, 영단어 랭킹(같은 학년 닉네임만)

type View =
  | { name: "hub" }
  | { name: "rain"; part: number }
  /** 단어장: 묶음 25개를 영어·뜻·발음으로 보고 따라 치기로 */
  | { name: "book"; part: number }
  | { name: "quiz"; mode: QuizMode; part: number | null; words: VocabWord[] }
  | { name: "done"; mode: QuizMode; part: number | null; result: QuizResult; message: string };

type Status = { week: VocabWeek; notebook: Notebook; ranks: VocabRanks };

const SETS = [...new Set(VOCAB_PARTS.map((p) => p.set))];

export function VocabLab({ initial }: { initial: Status }) {
  const data = usePracticeData();
  const setData = useSetPracticeData();
  const [view, setView] = useState<View>({ name: "hub" });
  const [part, setPart] = useState<number | null>(initial.week.part);
  const [status, setStatus] = useState<Status>(initial);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState(() => getPart(initial.week.part)?.set ?? SETS[0]);

  const cleared = (kind: "study" | "blank" | "listen", p: number) => data.progress.cleared.includes(`${VOCAB_CLEAR[kind]}-${p}`);

  /** 단어 발음 (단어장) */
  const say = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = VOCAB.listen.rate;
    u.volume = Math.max(0.2, getSettings().volume / 100);
    window.speechSynthesis.speak(u);
  };

  const refresh = async () => {
    const res = await safeCall(() => vocabStatus());
    if ("error" in res) return setError(res.error);
    setStatus(res);
  };
  /** 연구소 첫 화면으로 (이번 주 진행·단어장을 새로 읽어요) */
  const goHub = () => {
    setView({ name: "hub" });
    void refresh();
  };

  const finishQuiz = async (mode: QuizMode, p: number | null, result: QuizResult) => {
    let message = result.firstTry === result.total ? "한 번에 모두 맞혔다! 완벽해요!" : `처음에 틀린 ${result.missed.length}개는 틀린 단어장에 넣었다. 다음엔 더!`;
    if (mode === "review") {
      message = "복습 끝! 연속으로 두 번 맞힌 단어는 단어장에서 빠졌어요.";
      const res = await safeCall(() => vocabReviewDone());
      if (!("error" in res)) setData(res.data);
    }
    if (mode === "study") message = "단어장 따라 치기 끝! 이제 ② 빈칸 채우기로 확인해 봐요.";
    if (p !== null && mode !== "review") {
      const res = await safeCall(() => vocabClear(mode, p));
      if ("error" in res) message += ` (${res.error})`;
      else {
        setData(res.data);
        if (res.coins > 0) message = `${message} 처음 끝내서 코인 ${res.coins}개를 획득했다!`;
      }
    }
    setView({ name: "done", mode, part: p, result, message });
  };

  /* ───── 뜻 비 ───── */
  if (view.name === "rain") {
    const p = getPart(view.part)!;
    return (
      <div className="flex flex-col gap-3">
        <SoloGameFlow
          key={view.part}
          game="vocab"
          Field={RainField}
          fixedTrack="english"
          startOpts={{ part: view.part }}
          mission={`떨어지는 뜻을 보고 영어 단어를 쳐서 터뜨려요!`}
          extra={<p className="font-pixel text-body text-yellow-400">{partLabel(p)}</p>}
          rules={[
            `"사막"이 떨어지면 desert 를 치고 Enter (대소문자는 그대로)`,
            `♥ 하트 ${GAMES.rain.hearts}개 · 바닥에 떨어진 단어는 틀린 단어장에 들어가요`,
            `${GAMES.rain.hitsPerStage}개 터뜨릴 때마다 빨라져요`,
          ]}
          loadingText="단어 구름을 모으는 중..."
          hitLabel="맞힌 단어"
          back={{ label: "영단어 연구소", onClick: () => goHub() }}
        />
        <div className="text-center">
          <PixelButton size="sm" variant="ghost" onClick={() => goHub()}>
            ← 연구소로
          </PixelButton>
        </div>
      </div>
    );
  }

  /* ───── 퀴즈 ───── */
  if (view.name === "quiz") {
    return (
      <VocabQuiz
        mode={view.mode}
        words={view.words}
        onDone={(r) => void finishQuiz(view.mode, view.part, r)}
        onQuit={() => goHub()}
      />
    );
  }

  if (view.name === "done") {
    const { result } = view;
    return (
      <RetroWindow title="끝!" className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-4 text-center font-pixel text-body">
          <p className="title-lime text-hero">
            {result.firstTry} / {result.total}
          </p>
          <p className="text-small text-text-muted">한 번에 맞힌 단어</p>
          <DialogBox text={view.message} />
          {result.missed.length > 0 && (
            <ul className="grid w-full grid-cols-2 gap-1 text-left text-small">
              {result.missed.map((w) => (
                <li key={w.en} className="border-2 border-navy-900 bg-paper px-2 py-1">
                  <span className="font-typing">{w.en}</span> {w.ko}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {view.part !== null && view.mode !== "review" && (
              <PixelButton variant="success" autoFocus onClick={() => setView({ name: "quiz", mode: view.mode, part: view.part, words: partWords(view.part!) })}>
                ↻ 한 번 더
              </PixelButton>
            )}
            <PixelButton variant={view.mode === "review" ? "success" : "ghost"} autoFocus={view.mode === "review"} onClick={() => goHub()}>
              연구소로
            </PixelButton>
          </div>
        </div>
      </RetroWindow>
    );
  }

  /* ───── 단어장 (25개를 한눈에) ───── */
  if (view.name === "book") {
    const p = getPart(view.part)!;
    const words = partWords(view.part);
    return (
      <RetroWindow title={`📖 단어장 · ${partLabel(p)}`} className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-4 font-pixel text-body text-navy-900">
          <div className="flex flex-wrap items-center gap-2">
            <MissionLabel keyword="MISSION">소리 내어 읽고, 따라 쳐 봐요!</MissionLabel>
            <span className="text-small text-text-muted">단어를 누르면 발음을 들려줘요</span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {words.map((w) => (
              <li key={w.en}>
                <button
                  type="button"
                  onClick={() => say(w.en)}
                  className="win-bevel flex w-full items-baseline gap-2 bg-paper px-3 py-2 text-left hover:bg-sky-100 active:win-bevel-pressed"
                >
                  <span className="w-8 text-small text-text-muted">{w.n}</span>
                  <span className="flex flex-col">
                    <span className="font-typing text-heading">{w.en}</span>
                    <span className="text-small">{w.ko}</span>
                  </span>
                  <span className="ml-auto" aria-hidden>
                    🔊
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <PixelButton variant="success" className="flex-1" autoFocus onClick={() => setView({ name: "quiz", mode: "study", part: view.part, words })}>
              ✍️ 따라 치기 시작 ({words.length}개)
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => goHub()}>
              ← 연구소로
            </PixelButton>
          </div>
        </div>
      </RetroWindow>
    );
  }

  /* ───── 연구소 첫 화면 ───── */
  if (error) return <DialogBox text={error} />;

  const { week, notebook, ranks } = status;
  const sel = part ? getPart(part) : undefined;
  const weekDone = week.rain && week.blank && week.listen;

  const claim = async () => {
    const res = await safeCall(() => vocabClaimWeek());
    if ("error" in res) return setMsg(res.error);
    setData(res.data);
    setMsg(`이번 주 단어를 다 했다! 코인 ${res.coins}개를 획득했다!`);
    void refresh();
  };

  /** 묶음 하나로 하는 네 단계 (① 단어장 → ② 빈칸 → ③ 듣기 → ④ 뜻 비) */
  const renderSteps = (p: number, rainDone?: boolean) => {
    const steps = [
      { icon: "📖", title: "① 단어장", desc: "보고 듣고 따라 치기", done: cleared("study", p), go: () => setView({ name: "book", part: p }) },
      { icon: "✏️", title: "② 빈칸 채우기", desc: "d_s_rt 빈칸 채우기", done: cleared("blank", p), go: () => setView({ name: "quiz", mode: "blank", part: p, words: partWords(p) }) },
      { icon: "🎧", title: "③ 듣고 쓰기", desc: "소리만 듣고 철자 쓰기", done: cleared("listen", p), go: () => setView({ name: "quiz", mode: "listen", part: p, words: partWords(p) }) },
      { icon: "🌧️", title: "④ 뜻 비", desc: "뜻 보고 단어 터뜨리기", done: !!rainDone, go: () => setView({ name: "rain", part: p }) },
    ];
    const next = steps.find((s) => !s.done);
    return (
      <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        {steps.map((s) => (
          <li key={s.title}>
            <button
              type="button"
              onClick={s.go}
              className={`win-bevel flex h-full w-full flex-col items-center gap-1 px-2 py-3 text-center hover:bg-sky-100 active:win-bevel-pressed ${
                s.done ? "bg-lime-200" : s === next ? "bg-yellow-400" : "bg-paper"
              }`}
            >
              <span className="text-[36px] leading-none" aria-hidden>
                {s.icon}
              </span>
              <span className="font-title text-heading">{s.title}</span>
              <span className="text-small">{s.desc}</span>
              <span className="text-small font-bold">{s.done ? "✅ 끝냄" : s === next ? "▶ 지금 할 차례" : ""}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* 이번 주 단어 */}
      <RetroWindow title="📅 이번 주 단어">
        <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-title text-title">{week.label}</p>
            <span className="text-small text-text-muted">
              {week.week}주차 · {week.start.slice(5).replace("-", "/")} ~ {week.end.slice(5).replace("-", "/")}
            </span>
          </div>
          <p className="text-small">① → ④ 순서로 해 봐요. ②③④를 모두 하면 코인 {week.coins}개!</p>
          {renderSteps(week.part, week.rain)}
          {week.claimed ? (
            <p className="text-small">🎉 이번 주 보상을 받았어요. 다음 주 월요일에 새 묶음이 나와요!</p>
          ) : (
            <PixelButton variant="reward" disabled={!weekDone} onClick={claim}>
              {weekDone ? `🎁 보상 받기 (코인 ${week.coins})` : "②③④를 다 하면 보상을 받을 수 있어요"}
            </PixelButton>
          )}
          {msg && <DialogBox key={msg} text={msg} />}
        </div>
      </RetroWindow>

      {/* 다른 묶음 */}
      <RetroWindow title="📚 다른 단어 묶음">
        <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="탄 고르기">
            {SETS.map((set) => (
              <button
                key={set}
                type="button"
                role="tab"
                aria-selected={set === tab}
                onClick={() => {
                  setTab(set);
                  setPart(VOCAB_PARTS.find((p) => p.set === set)!.part);
                }}
                className={`h-10 px-4 ${set === tab ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
              >
                {set}탄
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {VOCAB_PARTS.filter((p) => p.set === tab).map((p) => {
              const marks = (["study", "blank", "listen"] as const).filter((k) => cleared(k, p.part)).length;
              return (
                <button
                  key={p.part}
                  type="button"
                  onClick={() => setPart(p.part)}
                  aria-pressed={part === p.part}
                  className={`flex flex-col items-center px-2 py-2 ${part === p.part ? "win-bevel-pressed bg-yellow-400 font-bold" : "win-bevel bg-paper"}`}
                >
                  <span className="font-title text-heading">
                    {p.from}~{p.to}
                  </span>
                  <span className="text-small">
                    {p.part === week.part ? "📅 이번 주 · " : ""}
                    {marks === 3 ? "✅ 다 했어요" : `${marks} / 3 단계`}
                  </span>
                </button>
              );
            })}
          </div>
          {sel && sel.part !== week.part && (
            <>
              <p className="font-title text-heading">{partLabel(sel)}</p>
              {renderSteps(sel.part)}
            </>
          )}
          {sel && sel.part === week.part && <p className="text-small text-text-muted">이 묶음은 위의 &ldquo;이번 주 단어&rdquo;에서 해요.</p>}
        </div>
      </RetroWindow>

      {/* 틀린 단어장 + 랭킹 */}
      <div className="grid gap-5 md:grid-cols-2">
        <RetroWindow title="📒 틀린 단어장">
          <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
            {!notebook.ready ? (
              <p className="text-small text-text-muted">단어장 준비 중이에요. (선생님: 데이터베이스에 영단어 SQL을 실행해 주세요)</p>
            ) : notebook.items.length === 0 ? (
              <p className="text-small">틀린 단어가 없어요! 빈칸·듣기·뜻 비에서 틀린 단어가 여기에 모여요.</p>
            ) : (
              <>
                <p className="text-small">
                  틀린 단어 <strong>{notebook.items.length}개</strong> · 복습에서 연속 {VOCAB.review.rightToRemove}번 맞히면 빠져요
                </p>
                <ul className="flex flex-wrap gap-1 text-small">
                  {notebook.items.slice(0, 12).map((w) => (
                    <li key={w.en} className="border-2 border-navy-900 bg-paper px-2" title={`${w.misses}번 틀림`}>
                      <span className="font-typing">{w.en}</span> {w.ko}
                      {w.streak > 0 && " ⭐"}
                    </li>
                  ))}
                  {notebook.items.length > 12 && <li className="px-2">… 외 {notebook.items.length - 12}개</li>}
                </ul>
                <PixelButton
                  variant="success"
                  onClick={() =>
                    setView({
                      name: "quiz",
                      mode: "review",
                      part: null,
                      words: shuffled(notebook.items)
                        .slice(0, VOCAB.review.perRound)
                        .map((w) => ({ n: 0, en: w.en, ko: w.ko })),
                    })
                  }
                >
                  복습하기 ({Math.min(VOCAB.review.perRound, notebook.items.length)}개)
                </PixelButton>
              </>
            )}
          </div>
        </RetroWindow>

        <RetroWindow title="🏆 영단어 랭킹">
          <div className="flex flex-col gap-2 font-pixel text-navy-900">
            <RankList title="🌧️ 뜻 비 최고 점수" entries={ranks.rain} empty="아직 뜻 비 기록이 없어요. 첫 주인공이 되어 봐요!" />
            <RankList title="📚 끝낸 묶음 (빈칸+듣기)" entries={ranks.parts} empty="아직 끝낸 묶음이 없어요!" />
            <p className="text-small text-text-muted">같은 학년 친구들끼리, 닉네임으로만 보여요.</p>
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** 랭킹 표 (닉네임만) */
function RankList({ title, entries, empty }: { title: string; entries: RankEntry[]; empty: string }) {
  return (
    <div className="border-2 border-navy-900 bg-surface px-3 py-2">
      <p className="mb-1 font-title text-body">{title}</p>
      {entries.length === 0 ? (
        <p className="text-small text-text-muted">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-0.5 text-small">
          {entries.map((e, i) => (
            <li key={i} className={`flex items-baseline gap-2 ${e.me ? "bg-yellow-400 font-bold" : ""}`}>
              <span className="w-6 text-center">{MEDALS[i] ?? i + 1}</span>
              <span className="flex-1 truncate">
                {e.nickname} <span className="text-text-muted">{e.classNo}반</span>
                {e.me && " (나)"}
              </span>
              <span>{e.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
