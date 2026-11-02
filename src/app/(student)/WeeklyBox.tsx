"use client";

import { useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import { useSetPracticeData } from "@/lib/practice/store";
import type { WeeklyData } from "@/lib/weekly/server";
import { claimWeeklyReward } from "./actions";

/** 이번 주 챌린지 3개: 진행도와 보상 받기 */
export function WeeklyBox({ initial }: { initial: WeeklyData }) {
  const [data, setData] = useState(initial);
  const setPractice = useSetPracticeData();
  const [msg, setMsg] = useState("");

  const claim = async (id: string) => {
    const res = await safeCall(() => claimWeeklyReward(id));
    if ("error" in res) return setMsg(res.error ?? "");
    if ("data" in res && res.data) setPractice(res.data);
    setData({ ...data, items: data.items.map((i) => (i.id === id ? { ...i, claimed: true } : i)) });
    setMsg(`코인 ${res.coins}개를 획득했다!`);
  };

  return (
    <RetroWindow title="🗓️ 이번 주 챌린지" className="mb-6">
      <p className="mb-2 font-pixel text-small text-text-muted">
        {data.week.start.slice(5)} ~ {data.week.end.slice(5)} · 월요일마다 새 챌린지! 하나에 코인 {data.reward}개
      </p>
      <ul className="grid gap-2 md:grid-cols-3">
        {data.items.map((c) => (
          <li key={c.id} className={`flex flex-col gap-1 border-3 border-navy-900 px-3 py-2 font-pixel text-body ${c.claimed ? "bg-lime-200" : "bg-paper"}`}>
            <span>
              <span className="mr-1">{c.icon}</span>
              {c.title}
            </span>
            <PixelProgressBar value={c.cur / c.goal} cells={10} label={`${c.title} 진행도`} />
            <span className="flex items-center justify-between text-small">
              {c.cur} / {c.goal}
              {c.claimed ? (
                <span className="font-bold">받았어요 ✓</span>
              ) : c.done ? (
                <PixelButton size="sm" variant="reward" onClick={() => claim(c.id)}>
                  보상 받기
                </PixelButton>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {msg && <p className="mt-2 font-pixel text-small text-navy-900">{msg}</p>}
    </RetroWindow>
  );
}
