"use client";

import { useRef, type ReactNode } from "react";
import { RetroWindow } from "./RetroWindow";

/** [?] 버튼: 누르면 설명 창이 뜸 (Esc나 × 로 닫기) */
export function HelpButton({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label={`${title} 설명 보기`}
        className="win-bevel inline-flex size-6 items-center justify-center font-pixel text-small font-bold text-navy-900 active:win-bevel-pressed"
      >
        ?
      </button>
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(560px,92vw)] bg-transparent p-0 backdrop:bg-navy-900/50"
      >
        <RetroWindow title={title} onClose={() => ref.current?.close()}>
          <div className="max-h-[70vh] overflow-y-auto font-pixel text-body leading-7 text-navy-900">{children}</div>
        </RetroWindow>
      </dialog>
    </>
  );
}
