"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/config/game";

// 타자 칠 때 화면 왼쪽 아래에 Caps Lock · Num Lock · 한/영 상태를 크게 보여 줘요 (민재 아이디어).
// 브라우저는 한/영 상태를 직접 알려 주지 않아서, 마지막으로 누른 글자 키로 짐작해요.
//   · 한글 조합 중(Process) 이거나 한글 자모가 들어오면 → 한글
//   · 영어 알파벳이 들어오면 → 영어
// 이 트랙에서 쳐야 하는 것과 다르거나 Caps Lock 이 켜져 있으면 빨갛게 크게 알려 줘요.

type Lang = "ko" | "en" | null;

const HANGUL = /[ㄱ-ㆎ가-힣]/;

export function KeyStatus({ track }: { track: Track }) {
  const [caps, setCaps] = useState(false);
  const [num, setNum] = useState<boolean | null>(null);
  const [lang, setLang] = useState<Lang>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // getModifierState 는 키를 누를 때마다 지금 켜짐/꺼짐을 알려 줘요
      if (typeof e.getModifierState === "function") {
        setCaps(e.getModifierState("CapsLock"));
        setNum(e.getModifierState("NumLock"));
      }
      if (e.type !== "keydown") return;
      if (e.key === "Process" || e.isComposing || HANGUL.test(e.key)) setLang("ko");
      else if (/^[a-zA-Z]$/.test(e.key)) setLang("en");
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
    };
  }, []);

  const want: Lang = track === "korean" ? "ko" : "en";
  const langWrong = lang !== null && lang !== want;
  // 한글 트랙에서 Caps Lock 은 상관없어요 (한글 입력 중엔 무시되니까). 영어·기호·코드에서만 경고
  const capsWrong = caps && track !== "korean";

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2 font-pixel">
      {capsWrong && (
        <p className="border-3 border-navy-900 bg-red-500 px-4 py-2 font-title text-title text-paper shadow-pixel-md">
          ⇪ Caps Lock 켜짐! 대문자로 쳐져요
        </p>
      )}
      {langWrong && (
        <p className="border-3 border-navy-900 bg-red-500 px-4 py-2 font-title text-title text-paper shadow-pixel-md">
          한/영 키! 지금 {lang === "ko" ? "한글" : "영어"} → {want === "ko" ? "한글" : "영어"}로
        </p>
      )}
      <div className="flex gap-1 text-small">
        <span className={`border-2 border-navy-900 px-2 py-0.5 ${lang === null ? "bg-paper text-text-muted" : langWrong ? "bg-red-500 text-paper" : "bg-lime-400 text-navy-900"}`}>
          {lang === null ? "한/영 ?" : lang === "ko" ? "한글" : "영어"}
        </span>
        <span className={`border-2 border-navy-900 px-2 py-0.5 ${capsWrong ? "bg-red-500 text-paper" : caps ? "bg-yellow-400 text-navy-900" : "bg-paper text-navy-900"}`}>
          Caps {caps ? "켜짐" : "꺼짐"}
        </span>
        {num !== null && (
          <span className={`border-2 border-navy-900 px-2 py-0.5 ${num ? "bg-paper text-navy-900" : "bg-yellow-400 text-navy-900"}`}>
            Num {num ? "켜짐" : "꺼짐"}
          </span>
        )}
      </div>
    </div>
  );
}
