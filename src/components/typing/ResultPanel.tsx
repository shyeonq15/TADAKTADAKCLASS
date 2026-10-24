"use client";

import type { ReactNode } from "react";
import { GROWTH, LEVEL_CLEAR, TRACK_LABELS } from "@/config/game";
import { getLevel } from "@/data/packs";
import { DialogBox } from "@/components/ui/DialogBox";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { StatCard } from "@/components/ui/StatCard";
import type { SaveResult } from "@/lib/practice/store";

/** 결과 화면: 타수, 정확도, 내 평균 대비 변화, 자주 틀린 키 (PRD P4) */
export function ResultPanel({ save, actions }: { save: SaveResult; actions: ReactNode }) {
  const { attempt, before } = save;
  const level = getLevel(attempt.track, attempt.level);

  const messages: string[] = [];
  if (attempt.suspicious) messages.push("이번 기록은 선생님 확인 후에 반영돼요.");
  if (save.coins > 0) messages.push(`코인 ${save.coins}개를 획득했다!`);
  if (save.firstClear) messages.push(`${TRACK_LABELS[attempt.track]} 레벨 ${attempt.level}을 클리어했다!`);
  if (save.unlockedLevel) messages.push(`레벨 ${save.unlockedLevel}이 열렸다!`);

  const missed = Object.entries(attempt.missedKeys)
    .filter(([k]) => k.trim())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        {save.personalBest ? (
          <>
            <p className="title-lime text-hero">NEW RECORD!</p>
            <p className="font-pixel text-body text-navy-900">어제의 나를 이겼다!</p>
          </>
        ) : (
          <p className="title-lime text-hero">CLEAR!</p>
        )}
      </div>

      <RetroWindow title="결과.txt">
        <div className="flex gap-2">
          <StatCard
            label="타수"
            value={attempt.cpm}
            unit="타/분"
            diff={before ? { value: Math.round(attempt.cpm - before.cpm), unit: "타" } : null}
          />
          <StatCard
            label="정확도"
            value={`${attempt.accuracy}%`}
            diff={before ? { value: Math.round((attempt.accuracy - before.accuracy) * 10) / 10, unit: "%p" } : null}
          />
          <StatCard label="시간" value={`${Math.round(attempt.durationMs / 1000)}초`} />
        </div>
        <p className="mt-3 font-pixel text-small text-text-muted">
          {before
            ? `▲▼ 는 최근 5판 기록의 가운데 값(${Math.round(before.cpm)}타 · ${before.accuracy}%)과 비교한 거예요.`
            : "첫 기록이에요! 다음 판부터 내 기록과 비교해 줄게요."}
        </p>

        <h3 className="mt-4 font-pixel text-body font-bold">자주 틀린 키</h3>
        {missed.length ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {missed.map(([key, n]) => (
              <li key={key} className="flex items-center gap-2 border-3 border-navy-900 bg-paper px-3 py-1">
                <span className="font-typing text-heading text-red-500">{key}</span>
                <span className="font-pixel text-small text-text-muted">{n}번</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 font-pixel text-body">틀린 키가 없어요. 완벽해요!</p>
        )}

        {level && !save.cleared && attempt.kind === "practice" && (
          <p className="mt-4 font-pixel text-small text-navy-900">
            레벨 통과 조건: 정확도 {LEVEL_CLEAR.minAccuracy}% 이상 · {level.goalCpm}타 이상. 다음엔 더!
          </p>
        )}
        {attempt.accuracy < GROWTH.minAccuracyForSpeed && (
          <p className="mt-2 font-pixel text-small text-navy-900">
            정확도가 {GROWTH.minAccuracyForSpeed}% 이상이면 빨라진 만큼 성장 점수가 올라요. 천천히 정확하게 쳐 봐요!
          </p>
        )}
      </RetroWindow>

      {messages.length > 0 && <DialogBox key={messages.join("|")} text={messages.join(" ")} />}

      <div className="flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  );
}
