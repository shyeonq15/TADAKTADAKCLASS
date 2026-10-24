import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
};

/** DESIGN.md 6장 RetroWindow: 윈도우 98 창. `_ □`는 장식, `×`만 실제 닫기. */
export function RetroWindow({ title, children, onClose, className = "" }: Props) {
  return (
    <section className={`win-bevel p-1 ${className}`} aria-label={title}>
      <header className="flex h-7 items-center justify-between bg-linear-to-r from-win-title-start to-win-title-end px-2">
        <h2 className="font-pixel text-small font-bold text-paper">{title}</h2>
        <div className="flex gap-0.5" aria-hidden={!onClose}>
          <span className="win-bevel flex size-5 items-center justify-center text-small leading-none">_</span>
          <span className="win-bevel flex size-5 items-center justify-center text-small leading-none">□</span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="창 닫기"
              className="win-bevel flex size-5 items-center justify-center text-small leading-none active:win-bevel-pressed"
            >
              ×
            </button>
          ) : (
            <span className="win-bevel flex size-5 items-center justify-center text-small leading-none">×</span>
          )}
        </div>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
