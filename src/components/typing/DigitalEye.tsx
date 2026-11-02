"use client";

import { useSettings } from "@/lib/settings";

/**
 * 디지털 눈: 방금 친 글자가 컴퓨터 안에서는 어떤 이진수인지 보여 줘요 (입력 → 이진수 → 출력).
 * 영어·숫자·기호는 ASCII 8비트, 한글은 유니코드 16비트. 설정에서 켠 학생만 보여요.
 * 타자 칸 밖(오른쪽 아래)에 따로 떠 있어서 지문 읽기를 방해하지 않아요.
 */
export function DigitalEye({ ch }: { ch: string | undefined }) {
  const { digitalEye } = useSettings();
  if (!digitalEye || !ch) return null;
  const code = ch.codePointAt(0) ?? 0;
  const ascii = code < 128;
  const bits = code.toString(2).padStart(ascii ? 8 : 16, "0");
  const shown = ch === " " ? "␣ (띄어쓰기)" : ch;
  return (
    <div aria-hidden className="pointer-events-none fixed bottom-4 right-4 z-40 border-3 border-navy-900 bg-ink px-4 py-2 font-pixel text-paper shadow-pixel-md">
      <p className="text-small text-sky-200">👁️ 디지털 눈 · {ascii ? "ASCII 8비트" : "유니코드 16비트"}</p>
      <p className="font-title text-heading">
        {shown} <span className="text-small text-sky-200">→ {code}</span>
      </p>
      <p className="font-typing text-body tracking-widest text-lime-400">{bits.replace(/(\d{4})(?=\d)/g, "$1 ")}</p>
    </div>
  );
}
