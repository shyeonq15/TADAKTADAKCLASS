"use client";

import { useState, type ReactNode } from "react";

/** 학생용(쉬운 말) / 전체 처리방침 탭 */
export function PrivacyTabs({ kid, full }: { kid: ReactNode; full: ReactNode }) {
  const [tab, setTab] = useState<"kid" | "full">("kid");
  const tabs = [
    ["kid", "학생용 (쉬운 말)"],
    ["full", "전체 처리방침"],
  ] as const;
  return (
    <div>
      <div role="tablist" className="flex gap-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-10 px-4 font-pixel text-body text-navy-900 ${tab === id ? "win-bevel font-bold" : "win-bevel-pressed bg-[#c4c0b8]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="border-t-2 border-win-shadow pt-4">
        {/* 둘 다 그려 두고 숨김: 검색·인쇄와 목차 링크가 동작하도록 */}
        <div hidden={tab !== "kid"}>{kid}</div>
        <div hidden={tab !== "full"}>{full}</div>
      </div>
    </div>
  );
}
