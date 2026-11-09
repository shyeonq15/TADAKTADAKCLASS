import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
};

/** DESIGN.md 6장 RetroWindow: 윈도우 98 창. `_ □`는 장식, `×`만 실제 닫기. 제목이 길면 …으로 줄여요. */
export function RetroWindow({ title, children, onClose, className = "" }: Props) {
  return (
    <section className={`win-bevel p-1 ${className}`} aria-label={title}>
      <header className="flex h-7 items-center justify-between bg-linear-to-r from-win-title-start to-win-title-end px-2">
        <h2 className="min-w-0 truncate font-pixel text-small font-bold text-paper">{title}</h2>
        <div className="flex shrink-0 gap-0.5" aria-hidden={!onClose}>
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
      {/* 좁은 화면에서 표처럼 넓은 내용은 창 안에서만 옆으로 밀려요 (페이지가 넓어져 작게 보이지 않게) */}
      <div className="p-4 max-sm:overflow-x-auto max-sm:p-3">{children}</div>
    </section>
  );
}
