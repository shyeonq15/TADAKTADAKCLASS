"use client";

import { useMemo, useRef, useState } from "react";
import { conceptQuizDone } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import { useSetPracticeData } from "@/lib/practice/store";
import { allAnswers, chosung, sameAnswer, wordBank, type QuizSentence } from "@/lib/explore/quiz";
import { play } from "@/lib/sound";
import type { ConceptQuiz } from "@/lib/explore/server";

// 개념 빈칸 퀴즈: 문장의 빈칸을 앞에서부터 하나씩 채워요.
// 빈칸에는 초성 힌트(압력 → ㅇㄹ), 아래에는 보기 단어가 있어요.
// 틀린 빈칸은 정답을 보여 주고, 그 문장은 맨 뒤에 한 번 더 나와요. 모든 문장을 맞히면 끝!
// 랭킹 점수 = 빈칸마다 처음 친 답이 맞은 개수 (서버가 다시 채점)

type Blank = { value: string; state: "ok" | "wrong" } | null;

/** 지금 시각(ms). 걸린 시간 재기용 */
const clock = () => performance.now();

const blanksOf = (s: QuizSentence) => s.filter((p) => typeof p !== "string") as { answer: string }[];

export function ConceptQuizPlay({ quiz }: { quiz: ConceptQuiz }) {
  const setData = useSetPracticeData();
  const answers = useMemo(() => allAnswers(quiz.sentences), [quiz.sentences]);
  /** 문장마다 첫 빈칸이 전체에서 몇 번째인지 */
  const offsets = useMemo(
    () => quiz.sentences.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + blanksOf(quiz.sentences[i - 1]).length], []),
    [quiz.sentences],
  );

  const [queue, setQueue] = useState(() => quiz.sentences.map((_, i) => i));
  const [filled, setFilled] = useState<Blank[]>([]);
  const [typed, setTyped] = useState("");
  const [round, setRound] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [missed, setMissed] = useState<Set<number>>(() => new Set());
  const [end, setEnd] = useState<null | { message: string; score: number; total: number; ms: number }>(null);
  const [saving, setSaving] = useState(false);
  // 빈칸마다 처음 친 답 (랭킹 채점용), 시작 시각
  const firstAnswers = useRef<string[]>([]);
  const startedAt = useRef(0);

  const total = quiz.sentences.length;
  const si = queue[0];
  const sentence = quiz.sentences[si];
  const blanks = sentence ? blanksOf(sentence) : [];
  const at = filled.length;
  const sentenceDone = sentence && at >= blanks.length;
  const allRight = filled.every((b) => b?.state === "ok");
  const bank = sentence ? wordBank(sentence, answers, si * 7919 + 17) : [];
  const usedWords = filled.filter((f) => f?.state === "ok").map((f) => f!.value);

  const restart = () => {
    setQueue(quiz.sentences.map((_, i) => i));
    setFilled([]);
    setTyped("");
    setCleared(0);
    setMissed(new Set());
    setEnd(null);
    firstAnswers.current = [];
    startedAt.current = 0;
    setRound((r) => r + 1);
  };

  const finish = async (missedCount: number) => {
    setSaving(true);
    const ms = Math.round(clock() - startedAt.current);
    const res = await safeCall(() => conceptQuizDone(quiz.packId, { firstAnswers: answers.map((_, i) => firstAnswers.current[i] ?? ""), durationMs: ms }));
    setSaving(false);
    let message = missedCount === 0 ? "모든 문장을 한 번에 맞혔다! 개념 박사예요!" : `헷갈린 문장 ${missedCount}개도 끝까지 맞혔다! 다음엔 더!`;
    // 서버에 못 보냈을 때를 위해 화면에서도 세어 둬요
    let score = answers.filter((a, i) => sameAnswer(firstAnswers.current[i] ?? "", a)).length;
    if ("error" in res) message += ` (${res.error})`;
    else {
      setData(res.data);
      score = res.score;
      if (res.best) message += " 내 최고 기록을 갱신했다!";
      if (res.coins > 0) message += ` 처음 끝내서 코인 ${res.coins}개를 획득했다!`;
    }
    setEnd({ message, score, total: answers.length, ms });
  };

  const submit = () => {
    if (!sentence || saving) return;
    if (!startedAt.current) startedAt.current = clock();
    if (sentenceDone) {
      const [cur, ...rest] = queue;
      const next = allRight ? rest : [...rest, cur];
      if (allRight) setCleared((n) => n + 1);
      setFilled([]);
      setTyped("");
      if (!next.length) return void finish(missed.size);
      setQueue(next);
      return;
    }
    if (!typed.trim()) return;
    const g = offsets[si] + at;
    if (firstAnswers.current[g] === undefined) firstAnswers.current[g] = typed.trim();
    const ok = sameAnswer(typed, blanks[at].answer);
    play(ok ? "pop" : "error");
    if (!ok) setMissed((m) => new Set(m).add(si));
    setFilled((f) => [...f, { value: ok ? typed.trim() : blanks[at].answer, state: ok ? "ok" : "wrong" }]);
    setTyped("");
  };

  if (end) {
    return (
      <RetroWindow title="개념 퀴즈 끝!" className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-4 text-center font-pixel text-body">
          <p className="title-lime text-hero">
            {end.score} / {end.total}
          </p>
          <p className="text-small text-text-muted">
            처음에 맞힌 빈칸 · {Math.floor(end.ms / 60000)}분 {Math.floor(end.ms / 1000) % 60}초
          </p>
          <DialogBox text={end.message} />
          <div className="flex flex-wrap justify-center gap-2">
            <PixelButton variant="success" autoFocus onClick={restart}>
              ↻ 한 번 더
            </PixelButton>
            <PixelLink href="/explore" variant="ghost">
              교과 탐험 · 랭킹 보기
            </PixelLink>
          </div>
        </div>
      </RetroWindow>
    );
  }

  let b = -1;
  return (
    <RetroWindow key={round} title={`${quiz.icon} ${quiz.subject} 개념 퀴즈 · ${quiz.title}`} className="mx-auto w-full max-w-4xl">
      <div className="flex flex-col gap-4 font-pixel text-body text-navy-900">
        <div className="flex flex-wrap items-center gap-2">
          <MissionLabel keyword="MISSION">빈칸에 알맞은 말을 쳐요!</MissionLabel>
          <span className="text-small text-text-muted">
            맞힌 문장 {cleared} / {total} · 빈칸의 ㅇㄹ 은 초성 힌트예요
          </span>
        </div>
        <div className="win-bevel-pressed h-4 bg-paper">
          <div className="h-full bg-lime-400" style={{ width: `${(cleared / total) * 100}%` }} />
        </div>

        {/* 문장 */}
        <p className="border-3 border-navy-900 bg-paper px-5 py-8 font-title text-title leading-[2.2]">
          {sentence.map((p, k) => {
            if (typeof p === "string") return <span key={k}>{p}</span>;
            b++;
            const f = filled[b];
            const current = b === at && !sentenceDone;
            return (
              <span
                key={k}
                className={`mx-1 inline-block border-b-4 px-2 text-center ${
                  f?.state === "ok"
                    ? "border-navy-900 bg-lime-200"
                    : f?.state === "wrong"
                      ? "border-red-500 bg-paper text-red-500 underline decoration-2"
                      : current
                        ? "border-navy-900 bg-yellow-400"
                        : "border-navy-900 bg-surface text-text-muted"
                }`}
                style={{ minWidth: `${Math.max(2, p.answer.length) * 1.2 + 1}em` }}
                aria-label={f ? `빈칸 ${b + 1}: ${f.value}` : `빈칸 ${b + 1}, 초성 ${chosung(p.answer)}`}
              >
                {f ? f.value : chosung(p.answer)}
              </span>
            );
          })}
        </p>

        {/* 보기 */}
        <div className="flex flex-wrap items-center gap-2" aria-label="보기">
          <span className="text-small font-bold">보기</span>
          {bank.map((w) => (
            <span
              key={w}
              className={`border-2 border-navy-900 px-3 py-1 text-body ${usedWords.includes(w) ? "bg-win-gray text-text-muted line-through" : "bg-paper"}`}
            >
              {w}
            </span>
          ))}
        </div>

        <input
          value={typed}
          onChange={(e) => {
            const native = e.nativeEvent as InputEvent;
            if (native.inputType === "insertFromPaste" || native.inputType === "insertFromDrop") return;
            setTyped(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          readOnly={!!sentenceDone || saving}
          aria-label="빈칸에 들어갈 말을 치고 Enter"
          placeholder={sentenceDone ? "Enter를 누르면 다음 문장" : `노란 빈칸(${chosung(blanks[at]?.answer ?? "")})에 들어갈 말을 치고 Enter`}
          className="win-bevel-pressed h-16 bg-surface px-4 font-typing text-typing outline-none"
        />

        {sentenceDone && (
          <p role="status" className={`border-3 border-navy-900 px-3 py-2 ${allRight ? "bg-lime-200" : "bg-paper"}`}>
            {allRight ? "정답! 문장을 완성했다!" : "빨간 칸이 정답이에요. 이 문장은 맨 뒤에 한 번 더 나와요."}
          </p>
        )}

        <PixelButton variant="success" onClick={submit} disabled={saving || (!sentenceDone && !typed.trim())}>
          {saving ? "채점하는 중..." : sentenceDone ? "다음 문장 ▶ (Enter)" : "확인 (Enter)"}
        </PixelButton>
      </div>
    </RetroWindow>
  );
}
