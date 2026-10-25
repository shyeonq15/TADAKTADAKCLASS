"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { RetroWindow } from "./RetroWindow";

const subscribe = () => () => {};

/**
 * [?] 버튼: 누르면 설명 창이 뜸 (Esc나 × 로 닫기).
 * 설명 창은 문단(<p>) 안에 들어가면 안 되므로 페이지 맨 바깥(body)에 그림.
 */
export function HelpButton({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
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
      {isClient &&
        createPortal(
          <dialog
            ref={ref}
            onClick={(e) => e.target === ref.current && ref.current?.close()}
            className="m-auto w-[min(560px,92vw)] bg-transparent p-0 backdrop:bg-navy-900/50"
          >
            <RetroWindow title={title} onClose={() => ref.current?.close()}>
              <div className="max-h-[70vh] overflow-y-auto font-pixel text-body leading-7 text-navy-900">{children}</div>
            </RetroWindow>
          </dialog>,
          document.body,
        )}
    </>
  );
}
