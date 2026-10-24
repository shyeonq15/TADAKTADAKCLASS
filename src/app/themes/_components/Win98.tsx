import type { ReactNode } from "react";

/** 시안용 윈도우 98 창. 시안 C·D가 함께 씁니다. */
export function Win98({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`win-bevel p-1 ${className}`}>
      <header className="flex h-7 items-center justify-between bg-linear-to-r from-win-title-start to-win-title-end px-2">
        <h2 className="font-pixel text-small font-bold text-paper">{title}</h2>
        <div aria-hidden className="flex gap-0.5">
          {["_", "□", "×"].map((b) => (
            <span key={b} className="win-bevel flex size-5 items-center justify-center text-small leading-none">
              {b}
            </span>
          ))}
        </div>
      </header>
      {children}
    </section>
  );
}
