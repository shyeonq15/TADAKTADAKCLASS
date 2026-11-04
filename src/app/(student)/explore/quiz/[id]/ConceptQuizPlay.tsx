"use client";

import { useState } from "react";
import { conceptQuizDone } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import { useSetPracticeData } from "@/lib/practice/store";
import { sameAnswer, type QuizSentence } from "@/lib/explore/quiz";
import { play } from "@/lib/sound";
import type { ConceptQuiz } from "@/lib/explore/server";

// 개념 빈칸 퀴즈: 문장의 빈칸을 앞에서부터 하나씩 채워요.
// 틀린 빈칸은 정답을 보여 주고, 그 문장은 맨 뒤에 한 번 더 나와요. 모든 문장을 맞히면 끝!

type Blank = { value: string; state: "ok" | "wrong" } | null;

const blanksOf = (s: QuizSentence) => s.filter((p) => typeof p !== "string") as { answer: string }[];

export function ConceptQuizPlay({ quiz }: { quiz: ConceptQuiz }) {
  const setData = useSetPracticeData();
  const [queue, setQueue] = useState(() => quiz.sentences.map((_, i) => i));
  const [filled, setFilled] = useState<Blank[]>([]);
  const [typed, setTyped] = useState("");
  const [round, setRound] = useState(0);
  const [cleared, setCleared] = useState(0);
  const [missed, setMissed] = useState<Set<number>>(() => new Set());
  const [end, setEnd] = useState<null | { message: string }>(null);

  const total = quiz.sentences.length;
  const si = queue[0];
  const sentence = quiz.sentences[si];
  const blanks = sentence ? blanksOf(sentence) : [];
  const at = filled.length; // 지금 채울 빈칸 번호
  const sentenceDone = sentence && at >= blanks.length;
  const allRight = filled.every((b) => b?.state === "ok");

  const restart = () => {
    setQueue(quiz.sentences.map((_, i) => i));
    setFilled([]);
    setTyped("");
    setCleared(0);
    setMissed(new Set());
    setEnd(null);
    setRound((r) => r + 1);
  };

  const finish = async (missedCount: number) => {
    const res = await safeCall(() => conceptQuizDone(quiz.packId));
    let message = missedCount === 0 ? "모든 문장을 한 번에 맞혔다! 개념 박사예요!" : `처음에 헷갈린 문장 ${missedCount}개도 끝까지 맞혔다! 다음엔 더!`;
    if ("error" in res) message += ` (${res.error})`;
    else {
      setData(res.data);
      if (res.coins > 0) message += ` 처음 끝내서 코인 ${res.coins}개를 획득했다!`;
    }
    setEnd({ message });
  };

  const submit = () => {
    if (!sentence) return;
    if (sentenceDone) {
      // 다음 문장. 틀린 빈칸이 있었으면 맨 뒤로 다시
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
            {total - missed.size} / {total}
          </p>
          <p className="text-small text-text-muted">한 번에 맞힌 문장</p>
          <DialogBox text={end.message} />
          <div className="flex flex-wrap justify-center gap-2">
            <PixelButton variant="success" autoFocus onClick={restart}>
              ↻ 한 번 더
            </PixelButton>
            <PixelLink href="/explore" variant="ghost">
              교과 탐험으로
            </PixelLink>
          </div>
        </div>
      </RetroWindow>
    );
  }

  // 문장 그리기: 빈칸은 정답 길이만큼의 칸
  let b = -1;
  return (
    <RetroWindow key={round} title={`${quiz.icon} ${quiz.subject} 개념 퀴즈 · ${quiz.title}`} className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-4 font-pixel text-body text-navy-900">
        <div className="flex flex-wrap items-center gap-2">
          <MissionLabel keyword="MISSION">빈칸에 알맞은 말을 쳐요!</MissionLabel>
          <span className="text-small text-text-muted">
            맞힌 문장 {cleared} / {total}
          </span>
        </div>
        <div className="win-bevel-pressed h-4 bg-paper">
          <div className="h-full bg-lime-400" style={{ width: `${(cleared / total) * 100}%` }} />
        </div>

        <p className="border-3 border-navy-900 bg-paper px-4 py-6 text-heading leading-[2.4]">
          {sentence.map((p, k) => {
            if (typeof p === "string") return <span key={k}>{p}</span>;
            b++;
            const f = filled[b];
            const current = b === at && !sentenceDone;
            return (
              <span
                key={k}
                className={`mx-1 inline-block min-w-16 border-b-3 px-2 text-center ${
                  f?.state === "ok"
                    ? "border-navy-900 bg-lime-200"
                    : f?.state === "wrong"
                      ? "border-red-500 bg-paper text-red-500 underline decoration-2"
                      : current
                        ? "border-navy-900 bg-yellow-400"
                        : "border-navy-900 bg-surface"
                }`}
                style={{ minWidth: `${Math.max(3, p.answer.length) * 1.1}em` }}
                aria-label={f ? `빈칸 ${b + 1}: ${f.value}` : `빈칸 ${b + 1}`}
              >
                {f ? f.value : current ? `(${b + 1})` : " "}
              </span>
            );
          })}
        </p>

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
          readOnly={!!sentenceDone}
          aria-label="빈칸에 들어갈 말을 치고 Enter"
          placeholder={sentenceDone ? "Enter를 누르면 다음 문장" : `(${at + 1})번 빈칸에 들어갈 말을 치고 Enter`}
          className="win-bevel-pressed h-14 bg-surface px-3 font-typing text-typing outline-none"
        />

        {sentenceDone && (
          <p role="status" className={`border-3 border-navy-900 px-3 py-2 ${allRight ? "bg-lime-200" : "bg-paper"}`}>
            {allRight ? "정답! 문장을 완성했다!" : "빨간 칸이 정답이에요. 이 문장은 맨 뒤에 한 번 더 나와요."}
          </p>
        )}

        <PixelButton variant="success" onClick={submit} disabled={!sentenceDone && !typed.trim()}>
          {sentenceDone ? "다음 문장 ▶ (Enter)" : "확인 (Enter)"}
        </PixelButton>
      </div>
    </RetroWindow>
  );
}
