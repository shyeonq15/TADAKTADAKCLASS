"use client";

import Link from "next/link";
import { GROWTH, TRACK_LABELS, TRACKS } from "@/config/game";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { missionTitle, todayTrack } from "@/lib/practice/mission";
import {
  dayKey,
  resetPractice,
  streakDays,
  todayGrowth,
  usePracticeData,
  weakKeys,
} from "@/lib/practice/store";
import { allTiers, isCodeMaster, profileTier } from "@/lib/scoring/tier";

export function HomeDashboard() {
  const data = usePracticeData();
  const { attempts, progress } = data;
  const tiers = allTiers(attempts);
  const track = todayTrack();
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
            <MissionLabel keyword="MISSION">{missionTitle(track)}</MissionLabel>
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

        <RetroWindow title="오늘의 성장 점수 (미리보기)">
          <div className="flex items-baseline justify-between">
            <span className="font-pixel text-body">오늘 모은 성장 점수</span>
            <span className="font-title text-stat">
              {growth.total}
              <span className="font-pixel text-small"> / {GROWTH.dailyCap}점</span>
            </span>
          </div>
          <div className="mt-2">
            <PixelProgressBar value={growth.total / GROWTH.dailyCap} label="오늘의 성장 점수" />
          </div>
          <p className="mt-2 font-pixel text-small text-text-muted">
            연속 연습 {streak}일째 · 어제의 나보다 나아지면 점수가 올라요
          </p>
        </RetroWindow>
      </div>

      <div className="flex flex-col gap-6">
        <RetroWindow title="내 티어">
          <div className="mb-3 flex items-center gap-2 font-pixel text-body">
            대표 티어 <TierBadge tier={profileTier(tiers)} codeMaster={isCodeMaster(tiers)} />
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {TRACKS.map((t) => (
              <li key={t} className="win-bevel-pressed flex items-center justify-between bg-paper px-2 py-1">
                <span className="font-pixel text-small">{TRACK_LABELS[t]}</span>
                <TierBadge tier={tiers[t]} />
              </li>
            ))}
          </ul>
          <p className="mt-2 font-pixel text-small text-text-muted">정확도 95% 이상 기록이 3번 기준을 넘으면 올라가요.</p>
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
          <p className="font-pixel text-body">
            코인 <strong className="font-title text-heading">{progress.coins}</strong> · 반 지갑 기여{" "}
            <strong className="font-title text-heading">{progress.classCoins}</strong>
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

      <div className="flex items-center justify-between gap-4 bg-ink px-4 py-2 font-pixel text-small text-paper md:col-span-2">
        <span>미리보기: 로그인 연결 전이라 기록과 코인이 이 컴퓨터에만 저장돼요.</span>
        <PixelButton
          size="sm"
          variant="ghost"
          onClick={() => {
            if (window.confirm("이 컴퓨터에 저장된 연습 기록을 모두 지울까요?")) resetPractice();
          }}
        >
          기록 지우기
        </PixelButton>
      </div>
    </div>
  );
}
