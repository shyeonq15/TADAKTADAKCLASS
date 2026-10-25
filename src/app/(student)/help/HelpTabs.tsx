"use client";

import { useState } from "react";
import { HELP_SECTIONS } from "@/components/help/HelpContent";
import { RetroWindow } from "@/components/ui/RetroWindow";

type Id = (typeof HELP_SECTIONS)[number]["id"];

/** 도움말 탭: 한 번에 한 주제만 보여 줌. 주소 끝 #tier 처럼 바로 열 수도 있어요 */
export function HelpTabs() {
  const [tab, setTab] = useState<Id>(() => {
    const hash = window.location.hash.slice(1);
    return (HELP_SECTIONS.find((s) => s.id === hash)?.id ?? HELP_SECTIONS[0].id) as Id;
  });
  const current = HELP_SECTIONS.find((s) => s.id === tab)!;
  const Body = current.Body;

  const choose = (id: Id) => {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <div className="flex flex-col">
      <div role="tablist" aria-label="도움말 주제" className="flex flex-wrap gap-1 px-2">
        {HELP_SECTIONS.map((s) => (
          <button
            key={s.id}
            role="tab"
            type="button"
            aria-selected={tab === s.id}
            aria-controls="help-panel"
            onClick={() => choose(s.id)}
            className={`h-10 px-4 font-pixel text-body text-navy-900 ${
              tab === s.id ? "win-bevel relative top-[3px] z-10 font-bold" : "win-bevel-pressed bg-[#c4c0b8]"
            }`}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div id="help-panel" role="tabpanel">
        <RetroWindow title={`${current.title}.txt`}>
          <div className="min-h-[360px] font-pixel text-body leading-7 text-navy-900">
            <Body />
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}
