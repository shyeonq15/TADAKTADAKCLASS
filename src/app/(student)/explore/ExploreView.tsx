"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { activitiesOf, EXPLORE_STARS } from "@/config/subjects";
import { RetroWindow } from "@/components/ui/RetroWindow";
import type { ExploreData, RankEntry } from "@/lib/explore/server";

const starText = (n: number) => "★".repeat(n) + "☆".repeat(3 - n);
const MEDALS = ["🥇", "🥈", "🥉"];

/** 랭킹 표 (닉네임만. 아직 기록이 없으면 안내) */
function RankList({ title, entries, empty }: { title: string; entries: RankEntry[]; empty: string }) {
  return (
    <div className="flex-1 border-2 border-navy-900 bg-surface px-3 py-2">
      <p className="mb-1 font-title text-body">{title}</p>
      {entries.length === 0 ? (
        <p className="text-small text-text-muted">{empty}</p>
      ) : (
        <ol className="flex flex-col gap-0.5 text-small">
          {entries.map((e, i) => (
            <li key={i} className={`flex items-baseline gap-2 ${e.me ? "bg-yellow-400 font-bold" : ""}`}>
              <span className="w-6 text-center">{MEDALS[i] ?? i + 1}</span>
              <span className="flex-1 truncate">
                {e.nickname} <span className="text-text-muted">{e.classNo}반</span>
                {e.me && " (나)"}
              </span>
              <span>{e.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** 과목 탭 → 그 과목 활동(이진수 연습실·영단어 연구소 …) + 단원 지도 (지문마다 별) */
export function ExploreView({ data }: { data: ExploreData }) {
  const params = useSearchParams();
  const withUnits = data.subjects.filter((s) => s.units.length > 0 || activitiesOf(s.id).length > 0);
  const [picked, setPicked] = useState(params.get("subject") ?? withUnits[0]?.id ?? data.subjects[0]?.id);
  const subject = data.subjects.find((s) => s.id === picked) ?? data.subjects[0];

  if (!data.ready) {
    return (
      <RetroWindow title="교과 탐험">
        <p className="font-pixel text-body">교과 탐험을 준비 중이에요. 선생님께 알려 주세요!</p>
      </RetroWindow>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="과목">
        {data.subjects.map((s) => {
          const total = s.units.reduce((n, u) => n + u.passages.length * 3, 0);
          const got = s.units.reduce((n, u) => n + u.passages.reduce((m, p) => m + p.stars, 0), 0);
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === subject.id}
              onClick={() => setPicked(s.id)}
              className={`flex h-14 flex-col items-center justify-center px-4 font-pixel text-body text-navy-900 ${
                s.id === subject.id ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"
              } ${s.units.length || activitiesOf(s.id).length ? "" : "opacity-60"}`}
            >
              <span>
                {s.icon} {s.label}
              </span>
              <span className="text-small font-normal">
                {s.units.length ? `★ ${got}/${total}` : activitiesOf(s.id).length ? `활동 ${activitiesOf(s.id).length}개` : "준비 중"}
              </span>
            </button>
          );
        })}
      </div>

      {activitiesOf(subject.id).length > 0 && (
        <RetroWindow title={`${subject.icon} ${subject.label} 활동`}>
          <ul className="grid gap-3 md:grid-cols-2">
            {activitiesOf(subject.id).map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="win-bevel flex items-center gap-3 bg-paper px-3 py-2 hover:bg-sky-100 active:win-bevel-pressed">
                  <span className="text-[40px] leading-none" aria-hidden>
                    {a.icon}
                  </span>
                  <span className="flex flex-col">
                    <span className="font-title text-heading text-navy-900">{a.title}</span>
                    <span className="font-pixel text-small text-text-muted">{a.desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </RetroWindow>
      )}

      <RetroWindow title={`${subject.icon} ${subject.label} 탐험 지도`}>
        {subject.units.length === 0 ? (
          <p className="font-pixel text-body">아직 {subject.label} 단원이 없어요. 선생님이 교과서 글을 넣어 주시면 여기에 나타나요!</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {subject.units.map((u) => {
              const cleared = u.passages.length > 0 && u.passages.every((p) => p.stars >= 1);
              const next = u.passages.find((p) => p.stars === 0);
              return (
                <li key={u.packId} className={`border-3 border-navy-900 px-3 py-2 ${cleared ? "bg-lime-200" : "bg-paper"}`}>
                  <div className="mb-2 flex flex-wrap items-baseline gap-2 font-pixel text-body text-navy-900">
                    <strong className="font-title text-heading">{u.unitNo ? `${u.unitNo}단원` : "단원"}</strong>
                    <span className="flex-1">{u.title}</span>
                    {cleared && <span className="border-2 border-navy-900 bg-yellow-400 px-2 text-small">🏁 탐험 완료</span>}
                    {next && (
                      <Link href={`/explore/play/${next.id}`} className="win-bevel px-3 py-1 text-small font-bold active:win-bevel-pressed">
                        ▶ 이어서 하기
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {u.passages.map((p, i) => (
                      <Link
                        key={p.id}
                        href={`/explore/play/${p.id}`}
                        title={`지문 ${i + 1} · ${starText(p.stars)}`}
                        className={`flex w-14 flex-col items-center border-2 border-navy-900 py-1 font-pixel text-small hover:bg-sky-100 ${
                          p.id === next?.id ? "bg-yellow-400 font-bold" : p.stars ? "bg-paper" : "bg-win-gray text-text-muted"
                        }`}
                      >
                        <span>{i + 1}</span>
                        <span className="tracking-tight text-navy-900">{starText(p.stars)}</span>
                      </Link>
                    ))}
                  </div>
                  {u.quiz > 0 && (
                    <Link
                      href={`/explore/quiz/${u.packId}`}
                      className="win-bevel mt-3 flex items-center justify-center gap-3 bg-yellow-400 px-4 py-3 font-title text-heading text-navy-900 hover:bg-lime-200 active:win-bevel-pressed"
                    >
                      <span className="text-[32px] leading-none" aria-hidden>
                        🧩
                      </span>
                      개념 퀴즈 풀기
                      <span className="font-pixel text-small font-normal">빈칸 {u.quiz}개 · 초성 힌트 · 틀리면 다시</span>
                    </Link>
                  )}
                  {data.ranks?.units[u.packId] && (
                    <div className="mt-3 flex flex-col gap-2 font-pixel md:flex-row">
                      <RankList title="⚡ 빠르게 친 친구" entries={data.ranks.units[u.packId].speed} empty="아직 기록이 없어요. 첫 주인공이 되어 봐요!" />
                      {u.quiz > 0 && <RankList title="🧩 퀴즈왕" entries={data.ranks.units[u.packId].quiz} empty="아직 퀴즈를 끝낸 친구가 없어요!" />}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
        <p className="mt-3 font-pixel text-small text-text-muted">
          별: ★ 정확도 {EXPLORE_STARS.one.accuracy}% · ★★ 정확도 {EXPLORE_STARS.two.accuracy}%에 내 평소 타수의 {Math.round(EXPLORE_STARS.two.speed * 100)}% · ★★★ 정확도{" "}
          {EXPLORE_STARS.three.accuracy}%에 내 평소 타수 이상. 다른 친구가 아니라 &ldquo;평소의 나&rdquo;와 비교해요!
        </p>
      </RetroWindow>

      {data.ranks && subject.units.length > 0 && (
        <RetroWindow title={`⭐ ${subject.label} 별 랭킹`}>
          <div className="font-pixel">
            <RankList title={`${subject.icon} ${subject.label} 단원에서 별을 가장 많이 모은 친구`} entries={data.ranks.subjects[subject.id] ?? []} empty="아직 별을 모은 친구가 없어요. 첫 별을 모아 봐요!" />
            <p className="mt-2 text-small text-text-muted">같은 학년 친구들끼리, 닉네임으로만 보여요.</p>
          </div>
        </RetroWindow>
      )}
    </div>
  );
}
