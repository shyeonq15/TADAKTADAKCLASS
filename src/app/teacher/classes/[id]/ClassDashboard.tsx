"use client";

import { useState } from "react";
import { TIER_LABELS, TIERS, TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { stepOfStage, tierOfStage } from "@/lib/practice/stages";
import type { ClassDash, DashStudent } from "@/lib/teacher/dashboard";
import { LESSON_COUNT } from "@/data/codeNotes";
import { BINARY_STAGES } from "@/config/binary";

type SortKey = "number" | Track | "practice" | "games" | "explore" | "keystrokes" | "lessons" | "last";

const games = (s: DashStudent) => s.week.rain + s.week.runner + s.week.vocab + s.week.boss + s.week.race;
const SORTERS: Record<SortKey, (s: DashStudent) => number | string> = {
  number: (s) => s.number,
  korean: (s) => -s.stages.korean,
  english: (s) => -s.stages.english,
  symbol: (s) => -s.stages.symbol,
  code: (s) => -s.stages.code,
  practice: (s) => -(s.week.practice + s.week.mission),
  games: (s) => -games(s),
  explore: (s) => -s.week.explore,
  keystrokes: (s) => -s.week.keystrokes,
  lessons: (s) => -s.lessons,
  last: (s) => s.lastDay ?? "0000",
};

/** 며칠 전 (오늘이면 "오늘") */
function ago(day: string | null, today: string) {
  if (!day) return "30일+";
  const d = Math.round((Date.parse(today) - Date.parse(day)) / 86400000);
  return d === 0 ? "오늘" : d === 1 ? "어제" : `${d}일 전`;
}

/** 누르면 정렬되는 표 머리 칸 */
function SortTh({
  k,
  children,
  className = "",
  sort,
  onSort,
}: {
  k: SortKey;
  children: React.ReactNode;
  className?: string;
  sort: SortKey;
  onSort: (k: SortKey) => void;
}) {
  return (
    <th className={`whitespace-nowrap px-1 py-2 ${className}`}>
      <button type="button" onClick={() => onSort(k)} className={`underline-offset-4 hover:underline ${sort === k ? "font-bold underline" : ""}`}>
        {children}
        {sort === k ? " ▼" : ""}
      </button>
    </th>
  );
}

export function ClassDashboard({ dash, today }: { dash: ClassDash; today: string }) {
  const [sort, setSort] = useState<SortKey>("number");
  const s = dash.summary;
  const sorted = [...dash.students].sort((a, b) => {
    const x = SORTERS[sort](a);
    const y = SORTERS[sort](b);
    return x < y ? -1 : x > y ? 1 : a.number - b.number;
  });
  // 정렬: "마지막 활동"은 최근이 위로
  if (sort === "last") sorted.reverse();


  return (
    <div className="flex flex-col gap-4">
      <RetroWindow title="📊 반 대시보드 (이번 주)">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {[
            ["이번 주 참여", `${s.activeWeek} / ${s.members}명`],
            ["오늘 미션 완료", `${s.missionToday} / ${s.members}명`],
            ["연습·미션 판", `${s.week.practice + s.week.mission}판`],
            ["게임 판", `${s.week.rain + s.week.runner + s.week.vocab + s.week.boss + s.week.race}판`],
            ["교과 탐험 지문", `${s.week.explore}개`],
          ].map(([label, value]) => (
            <div key={label} className="win-bevel-pressed bg-paper px-3 py-2">
              <p className="text-small text-text-muted">{label}</p>
              <p className="text-heading font-bold">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-small text-text-muted">
          게임 판 자세히: 단어 비 {s.week.rain} · 토끼 달리기 {s.week.runner} · 뜻 비 {s.week.vocab} · 보스전 {s.week.boss} · 친구 대결 {s.week.race} · 이번 주 반 전체 {s.week.keystrokes.toLocaleString()}타
          (선생님 테스트 계정은 빼고 셌어요)
        </p>
      </RetroWindow>

      <RetroWindow title="🏅 트랙별 티어 분포 (몇 명이 어느 티어에)">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-body">
            <thead>
              <tr>
                <th className="border-2 border-navy-900 bg-win-gray px-2 py-1">트랙</th>
                {TIERS.map((t) => (
                  <th key={t} className="border-2 border-navy-900 bg-win-gray px-1 py-1">
                    <TierBadge tier={t} />
                  </th>
                ))}
                <th className="border-2 border-navy-900 bg-win-gray px-2 py-1">평균 단계</th>
              </tr>
            </thead>
            <tbody>
              {TRACKS.map((tr) => {
                const max = Math.max(1, ...TIERS.map((t) => s.tierCounts[tr][t]));
                return (
                  <tr key={tr}>
                    <th className="border-2 border-navy-900 bg-paper px-2 py-1">{TRACK_LABELS[tr]}</th>
                    {TIERS.map((t) => {
                      const n = s.tierCounts[tr][t];
                      return (
                        <td
                          key={t}
                          className="border-2 border-navy-900 px-2 py-1 font-bold"
                          style={{ background: n ? `rgba(91, 191, 58, ${0.15 + (n / max) * 0.6})` : "transparent" }}
                        >
                          {n || ""}
                        </td>
                      );
                    })}
                    <td className="border-2 border-navy-900 bg-paper px-2 py-1">
                      {s.avgStage[tr]} <span className="text-small text-text-muted">({TIER_LABELS[tierOfStage(Math.round(s.avgStage[tr]))]})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </RetroWindow>

      <RetroWindow title="👩‍🎓 학생별 현황 (제목을 누르면 정렬)">
        <div className="overflow-x-auto">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left">
                <SortTh sort={sort} onSort={setSort} k="number">번호·이름</SortTh>
                {TRACKS.map((t) => (
                  <SortTh sort={sort} onSort={setSort} key={t} k={t}>
                    {TRACK_LABELS[t]}
                  </SortTh>
                ))}
                <SortTh sort={sort} onSort={setSort} k="practice" className="text-right">
                  연습
                </SortTh>
                <SortTh sort={sort} onSort={setSort} k="games" className="text-right">
                  게임
                </SortTh>
                <SortTh sort={sort} onSort={setSort} k="explore" className="text-right">
                  탐험
                </SortTh>
                <SortTh sort={sort} onSort={setSort} k="keystrokes" className="text-right">
                  이번 주 타
                </SortTh>
                <SortTh sort={sort} onSort={setSort} k="lessons" className="text-right">
                  파이썬·이진수
                </SortTh>
                <SortTh sort={sort} onSort={setSort} k="last" className="text-right">
                  마지막 활동
                </SortTh>
              </tr>
            </thead>
            <tbody>
              {sorted.map((st) => {
                const idle = !st.lastDay || Date.parse(today) - Date.parse(st.lastDay) >= 7 * 86400000;
                return (
                  <tr key={st.id} className={`border-b border-win-shadow ${st.test ? "opacity-50" : ""} ${idle && !st.test ? "bg-[#ffe3e3]" : ""}`}>
                    <td className="whitespace-nowrap px-1 py-1.5">
                      <strong>{st.number}</strong> {st.realName ?? "-"}
                      <span className="block text-small text-text-muted">
                        {st.nickname ?? "닉네임 없음"}
                        {st.test ? " · 테스트" : ""}
                        {st.missionToday ? " · ✅미션" : ""}
                      </span>
                    </td>
                    {TRACKS.map((t) => (
                      <td key={t} className="whitespace-nowrap px-1 py-1.5">
                        <TierBadge tier={tierOfStage(st.stages[t])} />
                        <span className="ml-1 text-small">{stepOfStage(st.stages[t])}단계</span>
                      </td>
                    ))}
                    <td className="px-1 py-1.5 text-right" title={`연습 ${st.week.practice} · 미션 ${st.week.mission}`}>
                      {st.week.practice + st.week.mission}
                    </td>
                    <td
                      className="px-1 py-1.5 text-right"
                      title={`단어 비 ${st.week.rain} · 토끼 ${st.week.runner} · 뜻 비 ${st.week.vocab} · 보스 ${st.week.boss} · 대결 ${st.week.race}`}
                    >
                      {games(st)}
                    </td>
                    <td className="px-1 py-1.5 text-right">{st.week.explore}</td>
                    <td className="px-1 py-1.5 text-right">{st.week.keystrokes.toLocaleString()}</td>
                    <td className="whitespace-nowrap px-1 py-1.5 text-right text-small">
                      {st.lessons}/{LESSON_COUNT}강 · {st.binary}/{BINARY_STAGES.length}단계
                    </td>
                    <td className="whitespace-nowrap px-1 py-1.5 text-right text-small">{ago(st.lastDay, today)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-small text-text-muted">
          연습 = 연습 트랙 + 오늘의 미션, 게임 = 단어 비·토끼 달리기·보스전·친구 대결 (숫자 위에 마우스를 올리면 자세히). 분홍 줄 = 7일 넘게 기록이 없는 학생. 흐린 줄 =
          선생님 테스트 계정.
        </p>
      </RetroWindow>
    </div>
  );
}
