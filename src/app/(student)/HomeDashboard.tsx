"use client";

import Link from "next/link";
import { GROWTH, TIER_LABELS, TRACK_LABELS, TRACKS } from "@/config/game";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelLink } from "@/components/ui/PixelButton";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { missionTitle, sinceStart, teacherMission, todayTrack } from "@/lib/practice/mission";
import {
  dayKey,
  streakDays,
  todayGrowth,
  usePracticeData,
  weakKeys,
} from "@/lib/practice/store";
import { allTiers, isCodeMaster, profileTier, tierProgress } from "@/lib/scoring/tier";
import { CoinHelp, GrowthHelp, TierHelp } from "@/components/help/HelpContent";
import { HelpButton } from "@/components/ui/HelpButton";

const GROWTH_PARTS = [
  ["participation", "미션", GROWTH.participation.points],
  ["speed", "속도", GROWTH.speed.max],
  ["accuracy", "정확도", GROWTH.accuracy.max],
  ["streak", "연속", GROWTH.streak.max],
  ["firstClear", "첫 클리어", GROWTH.levelFirstClear.points],
] as const;

export function HomeDashboard() {
  const data = usePracticeData();
  const { attempts, progress } = data;
  const tiers = allTiers(attempts);
  const tm = teacherMission(data.packs);
  const track = tm?.track ?? todayTrack();
  const missionDone = progress.missionDays.includes(dayKey());
  const growth = todayGrowth(data);
  const weak = weakKeys(attempts);
  const streak = streakDays(attempts);
  // 약한 키가 가장 많이 나온 트랙으로 맞춤 연습
  const weakTrack =
    TRACKS.map((t) => ({ t, n: weakKeys(attempts, t).reduce((s, w) => s + w.count, 0) })).sort((a, b) => b.n - a.n)[0]
      ?.t ?? "korean";

  return (
    <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-6">
        <RetroWindow title="타닥타닥우리반.exe">
          <div className="flex flex-col items-center gap-4 bg-cream px-4 py-8 text-center">
            <div>
              <h1 className="title-lime text-hero">타닥타닥 우리반</h1>
              <p className="mt-1 font-pixel text-small tracking-[0.3em] text-navy-700">TADAK TADAK CLASS</p>
            </div>
            <MissionLabel keyword="MISSION">{tm ? `선생님 미션: ${tm.title}` : missionTitle(track)}</MissionLabel>
            {missionDone ? (
              <>
                <p className="font-pixel text-body">오늘 미션 완료! 내일도 만나요 ♡</p>
                <PixelLink href="/practice" variant="primary">
                  자유 연습 하러 가기
                </PixelLink>
              </>
            ) : (
              <PixelLink href="/mission" variant="success" autoFocus>
                ▶ 오늘의 미션 시작
              </PixelLink>
            )}
            {!progress.placement && (
              <p className="font-pixel text-small">
                처음이라면{" "}
                <Link href="/placement" className="underline underline-offset-4">
                  2분 배치 테스트
                </Link>
                부터 해 보세요!
              </p>
            )}
          </div>
        </RetroWindow>

        <RetroWindow title="오늘의 성장 점수">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-2 font-pixel text-body">
              오늘 모은 성장 점수
              <HelpButton title="성장 점수란?">
                <GrowthHelp />
              </HelpButton>
            </span>
            <span className="font-title text-stat">
              {growth.total}
              <span className="font-pixel text-small"> / {GROWTH.dailyCap}점</span>
            </span>
          </div>
          <div className="mt-2">
            <PixelProgressBar value={growth.total / GROWTH.dailyCap} label="오늘의 성장 점수" />
          </div>
          <ul className="mt-3 grid grid-cols-5 gap-1 text-center font-pixel text-small">
            {GROWTH_PARTS.map(([k, label, max]) => (
              <li key={k} className="win-bevel-pressed bg-paper px-1 py-1">
                <span className="block text-text-muted">{label}</span>
                <strong className="font-title text-body">{growth[k]}</strong>
                <span className="text-text-muted">/{max}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-pixel text-small text-navy-900">
            {missionDone
              ? `연속 연습 ${streak}일째! 내일도 오면 연속 점수가 올라요.`
              : `💡 오늘의 미션을 끝내면 +${GROWTH.participation.points}점! · 연속 연습 ${streak}일째`}
          </p>
        </RetroWindow>

        {progress.placement && (
          <RetroWindow title="처음의 나와 비교">
            <ul className="flex flex-col gap-1 font-pixel text-body">
              {TRACKS.map((t) => {
                const s = sinceStart(data, t);
                return (
                  <li key={t} className="flex items-center gap-3">
                    <span className="w-10 font-bold">{TRACK_LABELS[t]}</span>
                    {s ? (
                      <>
                        <span className="text-text-muted">처음 {s.start}타</span>→<span>지금 {s.now}타</span>
                        <span className={`ml-auto font-bold ${s.pct > 0 ? "text-lime-800" : s.pct < 0 ? "text-red-500" : ""}`}>
                          {s.pct > 0 ? `▲ ${s.pct}%` : s.pct < 0 ? `▼ ${-s.pct}%` : "그대로"}
                        </span>
                      </>
                    ) : (
                      <span className="text-small text-text-muted">처음 {progress.placement![t]}타 · 이 트랙을 연습하면 비교해 줄게요</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 font-pixel text-small text-text-muted">
              &ldquo;처음&rdquo;은 배치 테스트, &ldquo;지금&rdquo;은 최근 5판의 가운데 값이에요. 레벨이 올라가면 글이 어려워져서 잠깐 내려갈 수도 있어요.
            </p>
          </RetroWindow>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <RetroWindow title="내 티어">
          <div className="mb-3 flex items-center gap-2 font-pixel text-body">
            대표 티어 <TierBadge tier={profileTier(tiers)} codeMaster={isCodeMaster(tiers)} />
            <span className="ml-auto">
              <HelpButton title="티어란?">
                <TierHelp />
              </HelpButton>
            </span>
          </div>
          <ul className="flex flex-col gap-1">
            {TRACKS.map((t) => {
              const tp = tierProgress(attempts, t);
              return (
                <li key={t} className="win-bevel-pressed flex items-center gap-2 bg-paper px-2 py-1 font-pixel text-small">
                  <span className="w-8">{TRACK_LABELS[t]}</span>
                  <TierBadge tier={tiers[t]} />
                  {tp.next ? (
                    <span className="ml-auto text-text-muted" title={`정확도 95% 이상, ${tp.needCpm}타 넘는 기록 ${tp.need}번`}>
                      → {TIER_LABELS[tp.next]} {tp.needCpm}타{" "}
                      <span className="text-lime-800">{"●".repeat(tp.have)}</span>
                      {"○".repeat(tp.need - tp.have)}
                    </span>
                  ) : (
                    <span className="ml-auto text-lime-800">최고 티어!</span>
                  )}
                </li>
              );
            })}
          </ul>
        </RetroWindow>

        <RetroWindow title="약한 키 TOP 5">
          {weak.length ? (
            <>
              <ul className="flex flex-wrap gap-2">
                {weak.map((w) => (
                  <li key={w.key} className="border-3 border-navy-900 bg-paper px-3 py-1 font-typing text-heading text-red-500">
                    {w.key}
                  </li>
                ))}
              </ul>
              <PixelLink href={`/practice/weak/${weakTrack}`} variant="reward" size="sm" className="mt-3">
                맞춤 연습 하기
              </PixelLink>
            </>
          ) : (
            <p className="font-pixel text-body">연습을 하면 자주 틀리는 키를 찾아 줄게요.</p>
          )}
        </RetroWindow>

        <RetroWindow title="내 지갑">
          <p className="flex items-center gap-1 font-pixel text-body">
            코인 <strong className="font-title text-heading">{progress.coins}</strong> · 반 지갑 기여{" "}
            <strong className="font-title text-heading">{progress.classCoins}</strong>
            <span className="ml-auto">
              <HelpButton title="코인은 어떻게 모아요?">
                <CoinHelp />
              </HelpButton>
            </span>
          </p>
          <ul className="mt-2 max-h-32 overflow-y-auto font-sans text-small">
            {[...progress.coinLog]
              .reverse()
              .slice(0, 8)
              .map((c, i) => (
                <li key={i} className="flex justify-between border-b border-win-shadow py-0.5">
                  <span>{c.reason}</span>
                  <span className="text-lime-800">+{c.amount}</span>
                </li>
              ))}
          </ul>
        </RetroWindow>
      </div>

    </div>
  );
}
