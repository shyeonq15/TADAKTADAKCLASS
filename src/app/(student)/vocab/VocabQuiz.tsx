"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { VOCAB } from "@/config/vocab";
import { vocabAnswers } from "@/app/(student)/actions";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import { getSettings } from "@/lib/settings";
import { play } from "@/lib/sound";
import { isHangul } from "@/lib/typing/hangul";
import { blankMask, sameWord, shuffled, type VocabWord } from "@/lib/vocab/words";

// 단어 하나씩 치는 퀴즈: 빈칸 채우기 · 듣고 쓰기 · 틀린 단어장 복습.
// 틀린 단어는 맨 뒤로 다시 와서, 모두 맞혀야 끝나요. 처음에 맞혔는지가 점수예요.

export type QuizMode = "blank" | "listen" | "review";
export type QuizResult = { total: number; firstTry: number; missed: VocabWord[] };

const TITLES: Record<QuizMode, string> = { blank: "빈칸 채우기", listen: "듣고 쓰기", review: "틀린 단어 복습" };
/** 답을 몇 개 모아서 서버에 보낼지 (끝까지 안 해도 틀린 단어가 남게) */
const FLUSH_EVERY = 5;

/** 빈칸 모양: 가린 글자는 밑줄 칸, 보이는 글자는 그대로 */
function BlankWord({ en }: { en: string }) {
  const mask = blankMask(en);
  return (
    <p className="flex flex-wrap justify-center gap-1 font-typing text-title" aria-label={`빈칸 단어, ${en.length}글자`}>
      {[...en].map((ch, i) =>
        ch === " " ? (
          <span key={i} className="w-4" />
        ) : (
          <span key={i} className={`inline-block w-8 border-b-3 text-center ${mask[i] ? "border-navy-900 text-transparent" : "border-transparent"}`}>
            {mask[i] ? "_" : ch}
          </span>
        ),
      )}
    </p>
  );
}

export function VocabQuiz({ mode, words, onDone, onQuit }: { mode: QuizMode; words: VocabWord[]; onDone: (r: QuizResult) => void; onQuit: () => void }) {
  const [queue, setQueue] = useState(() => shuffled(words));
  const [done, setDone] = useState(0);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState<null | { ok: boolean }>(null);
  // 듣고 쓰기는 단어가 나올 때 한 번 읽어 주니까 1번부터
  const firstPlays = mode === "listen" ? 1 : 0;
  const [plays, setPlays] = useState(firstPlays);
  const tried = useRef(new Set<string>());
  const missed = useRef<VocabWord[]>([]);
  const firstTry = useRef(0);
  const pending = useRef<{ en: string; ok: boolean }[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const voiceOk = typeof window !== "undefined" && "speechSynthesis" in window;
  const word = queue[0];
  const total = useMemo(() => words.length, [words]);

  const flush = () => {
    if (!pending.current.length) return;
    const batch = pending.current;
    pending.current = [];
    void safeCall(() => vocabAnswers(batch));
  };
  // 중간에 나가도 그때까지 답은 보내요
  useEffect(() => () => flush(), []);

  const speak = (text: string) => {
    if (!voiceOk) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = VOCAB.listen.rate;
    u.volume = Math.max(0.2, getSettings().volume / 100);
    window.speechSynthesis.speak(u);
  };
  const listen = () => {
    if (!word || plays >= VOCAB.listen.maxPlays) return;
    speak(word.en);
    setPlays((n) => n + 1);
    input.current?.focus();
  };

  // 듣고 쓰기: 새 단어가 나오면 한 번 읽어 줘요 (버튼·Enter 를 누른 뒤라 브라우저가 소리를 허락해요)
  useEffect(() => {
    if (mode !== "listen" || !word) return;
    speak(word.en);
  }, [mode, word]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!word) return null;

  const check = () => {
    if (checked) {
      // 다음 단어. 틀렸으면 맨 뒤로 다시
      const [cur, ...rest] = queue;
      const next = checked.ok ? rest : [...rest, cur];
      setTyped("");
      setChecked(null);
      setPlays(firstPlays);
      if (!next.length) {
        flush();
        onDone({ total, firstTry: firstTry.current, missed: missed.current });
        return;
      }
      setQueue(next);
      return;
    }
    if (!typed.trim()) return;
    const ok = sameWord(typed, word.en);
    if (!tried.current.has(word.en)) {
      tried.current.add(word.en);
      if (ok) firstTry.current++;
      else missed.current.push(word);
      pending.current.push({ en: word.en, ok });
      if (pending.current.length >= FLUSH_EVERY) flush();
    }
    if (ok) setDone((n) => n + 1);
    setChecked({ ok });
    play(ok ? "pop" : "error");
    if (mode !== "listen") speak(word.en);
  };

  const imeWrong = [...typed].some((ch) => isHangul(ch));

  return (
    <RetroWindow title={`${TITLES[mode]} ${done} / ${total}`} className="mx-auto w-full max-w-2xl">
      <div className="flex flex-col gap-4 font-pixel text-body text-navy-900">
        {/* 진행 막대 */}
        <div className="win-bevel-pressed h-4 bg-paper">
          <div className="h-full bg-lime-400" style={{ width: `${(done / total) * 100}%` }} />
        </div>

        {/* 문제 */}
        <div className="flex flex-col items-center gap-3 border-3 border-navy-900 bg-paper px-4 py-6 text-center">
          {mode === "listen" ? (
            <>
              <PixelButton variant="reward" onClick={listen} disabled={plays >= VOCAB.listen.maxPlays || !!checked || !voiceOk}>
                🔊 다시 듣기 ({Math.max(0, VOCAB.listen.maxPlays - plays)}번 남음)
              </PixelButton>
              <p className="text-small text-text-muted">{checked ? word.ko : "잘 듣고 영어 단어를 쳐요"}</p>
            </>
          ) : (
            <>
              <p className="font-title text-title">{word.ko}</p>
              {mode === "blank" ? (
                <BlankWord en={word.en} />
              ) : (
                <p className="text-small text-text-muted">
                  힌트: <span className="font-typing">{word.en[0]}</span>로 시작하는 {word.en.replace(/ /g, "").length}글자
                </p>
              )}
            </>
          )}
        </div>

        <input
          ref={input}
          value={typed}
          onChange={(e) => {
            const native = e.nativeEvent as InputEvent;
            if (native.inputType === "insertFromPaste" || native.inputType === "insertFromDrop") return;
            setTyped(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              check();
            }
          }}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          autoFocus
          spellCheck={false}
          autoComplete="off"
          readOnly={!!checked}
          aria-label="영어 단어를 치고 Enter"
          placeholder={mode === "blank" ? "빈칸까지 채운 단어 전체를 치고 Enter" : "영어 단어를 치고 Enter"}
          className="win-bevel-pressed h-14 bg-surface px-3 font-typing text-typing outline-none"
        />
        <p className="min-h-6 text-small">{imeWrong ? "한/영 키를 확인하세요!" : ""}</p>

        {checked && (
          <div role="status" className={`border-3 border-navy-900 px-3 py-2 ${checked.ok ? "bg-lime-200" : "bg-paper"}`}>
            <p className="font-bold">{checked.ok ? "정답!" : "아쉬워요! 정답은:"}</p>
            <p>
              <span className={`font-typing text-heading ${checked.ok ? "" : "text-red-500 underline decoration-2"}`}>{word.en}</span>
              <span className="ml-2">{word.ko}</span>
            </p>
            {!checked.ok && <p className="text-small text-text-muted">이 단어는 맨 뒤에 한 번 더 나와요.</p>}
          </div>
        )}

        <div className="flex gap-2">
          <PixelButton key={checked ? "next" : "check"} variant="success" className="flex-1" onClick={check} disabled={!checked && !typed.trim()}>
            {checked ? "다음 ▶ (Enter)" : "확인 (Enter)"}
          </PixelButton>
          <PixelButton
            variant="ghost"
            onClick={() => {
              flush();
              onQuit();
            }}
          >
            그만하기
          </PixelButton>
        </div>
      </div>
    </RetroWindow>
  );
}
