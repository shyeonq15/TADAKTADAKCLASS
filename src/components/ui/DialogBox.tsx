"use client";

import { useEffect, useState } from "react";

const CHAR_INTERVAL_MS = 40;

/**
 * DESIGN.md 6장 DialogBox (RPG 대사창).
 * 한 글자씩 40ms 간격으로 나타나고, 클릭하면 바로 전체가 보입니다.
 * 문장이 바뀌면 key를 바꿔 새로 그려 주세요: <DialogBox key={text} text={text} />
 */
export function DialogBox({ text }: { text: string }) {
  const [shown, setShown] = useState(0);
  const done = shown >= text.length;

  useEffect(() => {
    // 움직임 줄이기 설정이면 첫 틱에 전체를 보여줌
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduced ? text.length : 1;
    const id = window.setInterval(() => {
      setShown((n) => {
        if (n + step >= text.length) window.clearInterval(id);
        return n + step;
      });
    }, CHAR_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <div
      role="status"
      onClick={() => setShown(text.length)}
      className="cursor-pointer border-3 border-paper bg-ink px-4 py-3 font-pixel text-body text-paper outline-3 outline-ink"
    >
      <span aria-hidden>&gt; </span>
      <span className="sr-only">{text}</span>
      <span aria-hidden>{text.slice(0, shown)}</span>
      {done && (
        <span aria-hidden className="blink ml-2">
          ▼
        </span>
      )}
    </div>
  );
}
