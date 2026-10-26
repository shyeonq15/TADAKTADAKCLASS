"use client";

import { useState } from "react";
import { GROWTH, TRACK_LABELS } from "@/config/game";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BALLOON, COIN } from "@/components/pixel/sprites";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { RoundRunner } from "@/components/typing/RoundRunner";
import { GrowthHelp } from "@/components/help/HelpContent";
import { HelpButton } from "@/components/ui/HelpButton";
import { missionRounds, missionTitle, teacherMission, missionTrack, type MissionRound } from "@/lib/practice/mission";
import { finishMission } from "@/app/(student)/actions";
import { safeCall } from "@/lib/practice/call";
import { dayKey, todayGrowth, usePracticeData, useSetPracticeData, weakKeys, type SaveResult } from "@/lib/practice/store";

type Phase =
  | { name: "intro" }
  | { name: "round"; rounds: MissionRound[]; index: number; saves: SaveResult[] }
  | { name: "between"; rounds: MissionRound[]; index: number; saves: SaveResult[] }
  | { name: "reward"; saves: SaveResult[]; coins: number; classCoins: number };

const GROWTH_LABELS = {
  participation: "미션 참여",
  speed: "속도 향상",
  accuracy: "정확도 향상",
  streak: "연속 연습",
  firstClear: "레벨 첫 클리어",
} as const;

export function MissionRun() {
  const data = usePracticeData();
  const setData = useSetPracticeData();
  const [phase, setPhase] = useState<Phase>({ name: "intro" });
  const tm = teacherMission(data.packs);
  const track = tm?.track ?? missionTrack(data);
  const doneToday = data.progress.missionDays.includes(dayKey());

  if (phase.name === "intro") {
    const begin = () => {
      const hasWeak = weakKeys(data.attempts, track, 3).length > 0;
      setPhase({ name: "round", rounds: missionRounds(data, hasWeak), index: 0, saves: [] });
    };
    return (
      <RetroWindow title="오늘의 미션.exe" className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-5 bg-navy-900 px-6 py-10 text-center">
          <MissionLabel keyword="MISSION">{tm ? `선생님 미션: ${tm.title}` : missionTitle(track)}</MissionLabel>
          <p className="font-pixel text-body text-sky-100">{TRACK_LABELS[track]} 트랙 · 3판 · 3~5분</p>
          <p className="blink font-title text-hero text-sky-200">PRESS START</p>
          <PixelButton variant="success" autoFocus onClick={begin}>
            ▶ 미션 시작 (Enter)
          </PixelButton>
          {doneToday && (
            <p className="font-pixel text-small text-yellow-400">
              오늘 미션은 이미 완료했어요! 한 번 더 해도 좋아요 (보상은 하루 한 번).
            </p>
          )}
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "round") {
    const r = phase.rounds[phase.index];
    return (
      <div className="flex flex-col gap-3">
        <p className="text-center font-title text-heading text-navy-900">
          ROUND {phase.index + 1} / {phase.rounds.length}
        </p>
        <RoundRunner
          key={phase.index}
          autoStart
          request={r.request}
          title={r.title}
          onSaved={async (save) => {
            const saves = [...phase.saves, save];
            if (phase.index + 1 < phase.rounds.length) {
              setPhase({ ...phase, name: "between", saves });
              return;
            }
            const reward = await safeCall(() => finishMission());
            if ("data" in reward) setData(reward.data);
            const ok = "firstToday" in reward;
            setPhase({ name: "reward", saves, coins: ok ? (reward.coins ?? 0) : 0, classCoins: ok ? (reward.classCoins ?? 0) : 0 });
          }}
        />
      </div>
    );
  }

  if (phase.name === "between") {
    const last = phase.saves[phase.saves.length - 1].attempt;
    return (
      <RetroWindow title="잠깐 쉬어요" className="mx-auto w-full max-w-md">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <p className="font-title text-title">ROUND {phase.index + 1} CLEAR!</p>
          <p className="font-pixel text-body">
            {last.cpm}타 · 정확도 {last.accuracy}%
          </p>
          <PixelButton
            variant="success"
            autoFocus
            onClick={() => setPhase({ ...phase, name: "round", index: phase.index + 1 })}
          >
            다음 판 ▶ (Enter)
          </PixelButton>
        </div>
      </RetroWindow>
    );
  }

  // 보상
  const growth = todayGrowth(data);
  const best = phase.saves.reduce((a, s) => (s.attempt.cpm > a.attempt.cpm ? s : a));
  const totalCoins = phase.coins + phase.saves.reduce((n, s) => n + s.coins, 0);
  const text = [
    `코인 ${totalCoins}개를 획득했다!`,
    phase.classCoins > 0 ? `우리 반 지갑에 코인 ${phase.classCoins}개가 쌓였다!` : "",
    best.personalBest ? "개인 기록을 갱신했다!" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      <div className="flex items-end gap-3">
        <PixelSprite sprite={BALLOON} scale={5} />
        <p className="title-lime text-hero">MISSION CLEAR!</p>
        <PixelSprite sprite={BALLOON} scale={5} className="-scale-x-100" />
      </div>
      <div className="flex gap-2">
        <PixelSprite sprite={COIN} scale={5} />
        <PixelSprite sprite={COIN} scale={5} className="-translate-y-3" />
        <PixelSprite sprite={COIN} scale={5} />
      </div>
      <div className="w-full">
        <DialogBox key={text} text={text} />
      </div>

      <RetroWindow title="오늘의 성장 점수" className="w-full">
        <table className="w-full font-sans text-body">
          <tbody>
            {(Object.keys(GROWTH_LABELS) as (keyof typeof GROWTH_LABELS)[]).map((k) => (
              <tr key={k} className="border-b border-win-shadow">
                <td className="py-1">{GROWTH_LABELS[k]}</td>
                <td className="py-1 text-right font-bold">{growth[k]}점</td>
              </tr>
            ))}
            <tr>
              <td className="pt-2 font-bold">합계 (하루 최대 {GROWTH.dailyCap}점)</td>
              <td className="pt-2 text-right font-title text-heading text-lime-800">{growth.total}점</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 flex items-center gap-2 font-pixel text-small text-text-muted">
          <HelpButton title="성장 점수란?">
            <GrowthHelp />
          </HelpButton>
          빠르기가 아니라 &ldquo;어제의 나보다 얼마나 나아졌는지&rdquo;로 점수를 매겨요. 이 점수가 모여 우리 반 점수가 돼요.
        </p>
      </RetroWindow>

      <div className="flex gap-3">
        <PixelLink href="/" variant="success">
          홈으로
        </PixelLink>
        <PixelLink href="/practice" variant="ghost">
          자유 연습
        </PixelLink>
      </div>
    </div>
  );
}
