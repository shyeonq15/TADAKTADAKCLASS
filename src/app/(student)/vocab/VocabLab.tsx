"use client";

import { useState } from "react";
import { GAMES } from "@/config/game";
import { VOCAB, VOCAB_CLEAR } from "@/config/vocab";
import { vocabClaimWeek, vocabClear, vocabStatus } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import { usePracticeData, useSetPracticeData } from "@/lib/practice/store";
import { getPart, partLabel, partWords, shuffled, VOCAB_PARTS, type VocabWord } from "@/lib/vocab/words";
import type { Notebook, VocabWeek } from "@/lib/vocab/server";
import { Field as RainField } from "../games/rain/RainGame";
import { SoloGameFlow } from "../games/SoloGameFlow";
import { VocabQuiz, type QuizMode, type QuizResult } from "./VocabQuiz";

// 영단어 연구소: 영어 선생님 단어 목록(4탄~10탄)으로 뜻 비 · 빈칸 채우기 · 듣고 쓰기 · 틀린 단어장 · 이번 주 단어

type View =
  | { name: "hub" }
  | { name: "rain"; part: number }
  | { name: "quiz"; mode: QuizMode; part: number | null; words: VocabWord[] }
  | { name: "done"; mode: QuizMode; part: number | null; result: QuizResult; message: string };

type Status = { week: VocabWeek; notebook: Notebook };

const SETS = [...new Set(VOCAB_PARTS.map((p) => p.set))];

export function VocabLab({ initial }: { initial: Status }) {
  const data = usePracticeData();
  const setData = useSetPracticeData();
  const [view, setView] = useState<View>({ name: "hub" });
  const [part, setPart] = useState<number | null>(initial.week.part);
  const [status, setStatus] = useState<Status>(initial);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [showList, setShowList] = useState(false);

  const cleared = (kind: "blank" | "listen", p: number) => data.progress.cleared.includes(`${VOCAB_CLEAR[kind]}-${p}`);

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
    if (mode === "review") message = "복습 끝! 연속으로 두 번 맞힌 단어는 단어장에서 빠졌어요.";
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

  /* ───── 연구소 첫 화면 ───── */
  if (error) return <DialogBox text={error} />;

  const { week, notebook } = status;
  const sel = part ? getPart(part) : undefined;
  const selWords = part ? partWords(part) : [];
  const weekDone = week.rain && week.blank && week.listen;

  const claim = async () => {
    const res = await safeCall(() => vocabClaimWeek());
    if ("error" in res) return setMsg(res.error);
    setData(res.data);
    setMsg(`이번 주 단어를 다 했다! 코인 ${res.coins}개를 획득했다!`);
    void refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      {/* 이번 주 단어 */}
      <RetroWindow title="이번 주 단어.exe">
        <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
          <div className="flex flex-wrap items-center gap-2">
            <MissionLabel keyword="MISSION">
              {week.week}주차 · {week.label}
            </MissionLabel>
            <span className="text-small text-text-muted">
              {week.start.slice(5).replace("-", "/")} ~ {week.end.slice(5).replace("-", "/")}
            </span>
          </div>
          <p className="text-small">이번 주 묶음으로 세 가지를 모두 하면 코인 {week.coins}개!</p>
          <ul className="grid gap-2 md:grid-cols-3">
            {[
              { ok: week.rain, label: "🌧️ 뜻 비 한 판", go: () => setView({ name: "rain", part: week.part }) },
              { ok: week.blank, label: "✏️ 빈칸 채우기 끝내기", go: () => setView({ name: "quiz", mode: "blank", part: week.part, words: partWords(week.part) }) },
              { ok: week.listen, label: "🎧 듣고 쓰기 끝내기", go: () => setView({ name: "quiz", mode: "listen", part: week.part, words: partWords(week.part) }) },
            ].map((t) => (
              <li key={t.label}>
                <button type="button" onClick={t.go} className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left ${t.ok ? "win-bevel bg-lime-200" : "win-bevel bg-paper"}`}>
                  <span>{t.label}</span>
                  <span>{t.ok ? "✅" : "▶"}</span>
                </button>
              </li>
            ))}
          </ul>
          {week.claimed ? (
            <p className="text-small">이번 주 보상을 받았어요. 다음 주 월요일에 새 묶음이 나와요!</p>
          ) : (
            <PixelButton variant="reward" disabled={!weekDone} onClick={claim}>
              {weekDone ? `🎁 보상 받기 (코인 ${week.coins})` : "세 가지를 다 하면 보상을 받을 수 있어요"}
            </PixelButton>
          )}
          {msg && <DialogBox key={msg} text={msg} />}
        </div>
      </RetroWindow>

      {/* 틀린 단어장 */}
      <RetroWindow title="틀린 단어장.txt">
        <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
          {!notebook.ready ? (
            <p className="text-small text-text-muted">단어장 준비 중이에요. (선생님: 데이터베이스에 영단어 SQL을 실행해 주세요)</p>
          ) : notebook.items.length === 0 ? (
            <p className="text-small">틀린 단어가 없어요! 활동에서 틀린 단어가 여기에 모여요.</p>
          ) : (
            <>
              <p className="text-small">
                틀린 단어 <strong>{notebook.items.length}개</strong> · 복습에서 연속 {VOCAB.review.rightToRemove}번 맞히면 빠져요
              </p>
              <ul className="flex flex-wrap gap-1 text-small">
                {notebook.items.slice(0, 30).map((w) => (
                  <li key={w.en} className="border-2 border-navy-900 bg-paper px-2" title={`${w.misses}번 틀림`}>
                    <span className="font-typing">{w.en}</span> {w.ko}
                    {w.streak > 0 && " ⭐"}
                  </li>
                ))}
                {notebook.items.length > 30 && <li className="px-2">… 외 {notebook.items.length - 30}개</li>}
              </ul>
              <PixelButton
                variant="success"
                onClick={() =>
                  setView({
                    name: "quiz",
                    mode: "review",
                    part: null,
                    words: shuffled(notebook.items).slice(0, VOCAB.review.perRound).map((w) => ({ n: 0, en: w.en, ko: w.ko })),
                  })
                }
              >
                📒 복습하기 ({Math.min(VOCAB.review.perRound, notebook.items.length)}개)
              </PixelButton>
            </>
          )}
        </div>
      </RetroWindow>

      {/* 단어 묶음 */}
      <RetroWindow title="단어 묶음 고르기">
        <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
          <p className="text-small text-text-muted">교육부 지정 중고등 기초 영단어 301~1000번 · 25개씩 한 묶음 · ✏️ 빈칸 🎧 듣기를 끝낸 묶음에 표시돼요</p>
          <div className="flex flex-col gap-2">
            {SETS.map((set) => (
              <div key={set} className="flex flex-wrap items-center gap-2">
                <span className="w-12 font-title">{set}탄</span>
                {VOCAB_PARTS.filter((p) => p.set === set).map((p) => (
                  <button
                    key={p.part}
                    type="button"
                    onClick={() => setPart(p.part)}
                    aria-pressed={part === p.part}
                    className={`h-10 min-w-24 px-2 text-small ${part === p.part ? "win-bevel-pressed bg-yellow-400 font-bold" : "win-bevel bg-paper"}`}
                  >
                    {p.from}~{p.to}
                    {p.part === week.part && " 📅"}
                    <span className="ml-1">
                      {cleared("blank", p.part) ? "✏️" : ""}
                      {cleared("listen", p.part) ? "🎧" : ""}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {sel && (
            <div className="flex flex-col gap-3 border-3 border-navy-900 bg-paper p-3">
              <p className="font-title text-heading">{partLabel(sel)}</p>
              <div className="grid gap-2 md:grid-cols-3">
                <PixelButton variant="success" onClick={() => setView({ name: "rain", part: sel.part })}>
                  🌧️ 뜻 비
                </PixelButton>
                <PixelButton variant="primary" onClick={() => setView({ name: "quiz", mode: "blank", part: sel.part, words: selWords })}>
                  ✏️ 빈칸 채우기 {cleared("blank", sel.part) ? "✅" : ""}
                </PixelButton>
                <PixelButton variant="primary" onClick={() => setView({ name: "quiz", mode: "listen", part: sel.part, words: selWords })}>
                  🎧 듣고 쓰기 {cleared("listen", sel.part) ? "✅" : ""}
                </PixelButton>
              </div>
              <p className="text-small text-text-muted">
                빈칸 채우기·듣고 쓰기는 {selWords.length}개를 모두 맞히면 끝나요 (틀린 단어는 맨 뒤에 다시 나와요). 처음 끝내면 코인 {VOCAB.clearCoins}개!
              </p>
              <button type="button" onClick={() => setShowList((s) => !s)} className="win-bevel self-start px-3 py-1 text-small">
                {showList ? "▲ 단어 목록 접기" : "▼ 단어 목록 보기"}
              </button>
              {showList && (
                <table className="w-full text-small">
                  <tbody>
                    {selWords.map((w) => (
                      <tr key={w.en} className="border-b border-win-shadow">
                        <td className="w-12 py-1 text-text-muted">{w.n}</td>
                        <td className="py-1 font-typing">{w.en}</td>
                        <td className="py-1">{w.ko}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </RetroWindow>
    </div>
  );
}
