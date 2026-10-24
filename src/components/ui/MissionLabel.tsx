import type { ReactNode } from "react";

type Keyword = "MISSION" | "ITEM" | "BOSS" | "NEW" | "LEVEL UP";

/** DESIGN.md 6장 MissionLabel: 검은 박스 + 굵은 키워드 + 설명. */
export function MissionLabel({ keyword, children }: { keyword: Keyword; children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-3 bg-ink px-3 py-2 font-pixel text-body text-paper">
      <strong className="font-title">{keyword}</strong>
      <span>{children}</span>
    </p>
  );
}
