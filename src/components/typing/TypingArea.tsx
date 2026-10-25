"use client";

import { useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { lineStates, type CharState, type SessionState } from "@/lib/typing/engine";

// DESIGN.md 6장 TypingArea: 장식·애니메이션·주사선 없이 가장 잘 읽히게.
// 지금 줄은 원문 아래에 내가 친 글자를 따로 보여 줘서, 한글 조합 중인 글자도 보입니다.

const CHAR_CLASS: Record<CharState, string> = {
  pending: "text-[var(--typing-pending)]",
  current: "bg-lime-200 text-navy-900 outline-2 outline-navy-900",
  composing: "bg-lime-200 text-navy-900",
  correct: "text-navy-900",
  error: "text-red-500 underline decoration-2 underline-offset-4",
};

/** 남은 줄은 몇 줄까지 미리 보여줄지 */
const LOOKAHEAD = 3;

/** 빈칸 채우기: 이 줄의 이 칸들은 칠 때까지 "_"로 가림 */
export type Mask = { line: number; start: number; length: number };

type Props = {
  session: SessionState;
  code: boolean;
  mask?: Mask;
  onInput: (value: string, composing: boolean) => void;
  onKey: () => void;
  onBlocked: () => void;
  disabled?: boolean;
};

const IGNORED_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "HangulMode", "Lang1", "Escape", "Tab"]);

function Line({
  text,
  states,
  code,
  number,
  hide,
}: {
  text: string;
  states: CharState[];
  code: boolean;
  number?: number;
  /** 가릴 칸 [시작, 끝) */
  hide?: [number, number];
}) {
  const indent = code ? (text.match(/^ */)?.[0].length ?? 0) : 0;
  return (
    <div className="flex">
      {code && <span className="w-10 shrink-0 select-none text-right pr-4 text-text-muted">{number}</span>}
      <span className="whitespace-pre">
        {[...text].map((ch, i) => {
          const state = states[i];
          const spaceError = ch === " " && state === "error";
          const hidden = hide && i >= hide[0] && i < hide[1] && (state === "pending" || state === "current" || state === "composing");
          // 들여쓰기 칸: 4칸마다 연한 점선 가이드
          const guide = i < indent && i % 4 === 0 ? "border-l-2 border-dotted border-sky-300" : "";
          return (
            <span key={i} className={`${CHAR_CLASS[state]} ${guide} ${spaceError ? "bg-[var(--typing-space-error)]" : ""}`}>
              {hidden ? "_" : spaceError ? "·" : ch}
            </span>
          );
        })}
      </span>
    </div>
  );
}

export function TypingArea({ session, code, mask, onInput, onKey, onBlocked, disabled }: Props) {
  const hideFor = (i: number): [number, number] | undefined =>
    mask && mask.line === i ? [mask.start, mask.start + mask.length] : undefined;
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  const { lines, lineIndex, typed, composing, doneLines } = session;
  const first = Math.max(0, lineIndex - 1);
  const last = Math.min(lines.length, lineIndex + 1 + LOOKAHEAD);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const native = e.nativeEvent as InputEvent;
    if (native.inputType === "insertFromPaste" || native.inputType === "insertFromDrop") {
      onBlocked();
      return;
    }
    composingRef.current = native.isComposing ?? composingRef.current;
    onInput(e.target.value, composingRef.current);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") e.preventDefault(); // 포커스가 빠져나가지 않게
    if ((e.ctrlKey || e.metaKey) && ["v", "V"].includes(e.key)) {
      e.preventDefault();
      onBlocked();
      return;
    }
    if (!IGNORED_KEYS.has(e.key)) onKey();
  };

  return (
    <div
      className="relative cursor-text border-3 border-navy-900 bg-surface px-6 py-5 font-typing"
      onClick={() => inputRef.current?.focus()}
    >
      <textarea
        ref={inputRef}
        value={typed}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => (composingRef.current = true)}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          onInput(e.currentTarget.value, false);
        }}
        onPaste={(e) => {
          e.preventDefault();
          onBlocked();
        }}
        onDrop={(e) => {
          e.preventDefault();
          onBlocked();
        }}
        onContextMenu={(e) => e.preventDefault()}
        disabled={disabled}
        autoFocus
        aria-label="여기에 타자를 치세요"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        className="absolute left-0 top-0 h-px w-px opacity-0"
      />

      <div className={code ? "text-typing-code" : "text-typing"}>
        {lines.slice(first, last).map((text, k) => {
          const i = first + k;
          if (i < lineIndex) {
            return (
              <div key={i} className="opacity-50">
                <Line text={text} states={lineStates(text, doneLines[i] ?? "", false)} code={code} number={i + 1} />
              </div>
            );
          }
          if (i === lineIndex) {
            return (
              <div key={i} className="my-1">
                <Line text={text} states={lineStates(text, typed, composing)} code={code} number={i + 1} hide={hideFor(i)} />
                {/* 내가 친 글자 */}
                <div className="flex border-b-2 border-dashed border-sky-300">
                  {code && <span className="w-10 shrink-0" />}
                  <span className="min-h-[1.5em] whitespace-pre text-navy-700">
                    {composing ? typed.slice(0, -1) : typed}
                    {composing && <span className="underline decoration-2">{typed.slice(-1)}</span>}
                    <span className="inline-block w-[0.55em] bg-navy-900 align-middle" style={{ height: "1em" }} />
                  </span>
                </div>
              </div>
            );
          }
          return <Line key={i} text={text} states={[...text].map(() => "pending")} code={code} number={i + 1} hide={hideFor(i)} />;
        })}
      </div>
    </div>
  );
}
