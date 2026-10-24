"use client";

import { useState } from "react";
import { PLACEMENT, TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { getLevel, maxLevel } from "@/data/packs";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TypingSession, type SessionResult } from "@/components/typing/TypingSession";
import { saveAttempt, savePlacement } from "@/lib/practice/store";
import { buildPlacementRound } from "@/lib/typing/passage";

type Phase =
  | { name: "ready"; index: number; results: Partial<Record<Track, number>> }
  | { name: "typing"; index: number; lines: string[]; results: Partial<Record<Track, number>> }
  | { name: "done"; cpm: Record<Track, number>; start: Record<Track, number> };

/** 타수로 시작 레벨 정하기 */
function startLevel(track: Track, cpm: number) {
  const steps = PLACEMENT.startLevelCpm[track];
  let level = 1;
  steps.forEach((min, i) => {
    if (cpm >= min) level = i + 1;
  });
  return Math.min(level, maxLevel(track));
}

/** 첫 접속 배치 테스트 (PRD P5): 트랙마다 30초씩, 2분 */
export function PlacementRun() {
  const [phase, setPhase] = useState<Phase>({ name: "ready", index: 0, results: {} });

  if (phase.name === "ready") {
    const track = TRACKS[phase.index];
    return (
      <RetroWindow title="배치 테스트.exe" className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-5 bg-navy-900 px-6 py-10 text-center">
          <MissionLabel keyword="NEW">
            배치 테스트 {phase.index + 1} / {TRACKS.length}
          </MissionLabel>
          <p className="font-title text-title text-sky-200">{TRACK_LABELS[track]} {PLACEMENT.secondsPerTrack}초</p>
          <p className="font-pixel text-body text-sky-100">
            {phase.index === 0
              ? "트랙마다 30초씩 쳐요. 끝까지 못 쳐도 괜찮아요. 평소처럼 편하게!"
              : `한/영 키를 ${track === "korean" ? "한글" : "영어"}로 맞췄는지 확인해요.`}
          </p>
          <PixelButton
            variant="success"
            autoFocus
            onClick={() => setPhase({ ...phase, name: "typing", lines: buildPlacementRound(track) })}
          >
            ▶ 시작 (Enter)
          </PixelButton>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "typing") {
    const track = TRACKS[phase.index];
    const onFinish = (r: SessionResult) => {
      saveAttempt({
        kind: "placement",
        track,
        level: 0,
        mode: "placement",
        cpm: r.stats.cpm,
        accuracy: r.stats.accuracy,
        keystrokes: r.stats.keystrokes,
        durationMs: r.stats.elapsedMs,
        missedKeys: r.missedKeys,
        flags: r.flags,
      });
      const results = { ...phase.results, [track]: r.stats.cpm };
      if (phase.index + 1 < TRACKS.length) {
        setPhase({ name: "ready", index: phase.index + 1, results });
        return;
      }
      const cpm = results as Record<Track, number>;
      const start = Object.fromEntries(TRACKS.map((t) => [t, startLevel(t, cpm[t])])) as Record<Track, number>;
      savePlacement(cpm, start);
      setPhase({ name: "done", cpm, start });
    };
    return (
      <RetroWindow title={`배치 테스트 - ${TRACK_LABELS[track]}`} className="mx-auto w-full max-w-4xl">
        <TypingSession
          key={track}
          lines={phase.lines}
          track={track}
          timeLimitSec={PLACEMENT.secondsPerTrack}
          onFinish={onFinish}
        />
      </RetroWindow>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5">
      <p className="title-lime text-hero">READY!</p>
      <RetroWindow title="배치 결과" className="w-full">
        <table className="w-full font-sans text-body">
          <thead>
            <tr className="border-b-2 border-navy-900 text-left">
              <th className="py-1">트랙</th>
              <th className="py-1 text-right">타수</th>
              <th className="py-1 text-right">시작 레벨</th>
            </tr>
          </thead>
          <tbody>
            {TRACKS.map((t) => (
              <tr key={t} className="border-b border-win-shadow">
                <td className="py-1">{TRACK_LABELS[t]}</td>
                <td className="py-1 text-right">{phase.cpm[t]}타</td>
                <td className="py-1 text-right font-bold">
                  레벨 {phase.start[t]} · {getLevel(t, phase.start[t])?.title}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 font-pixel text-small text-text-muted">
          이 기록은 성장 점수의 첫 기준값이 돼요. 이제부터는 어제의 나와 비교해요!
        </p>
      </RetroWindow>
      <div className="flex gap-3">
        <PixelLink href="/mission" variant="success" autoFocus>
          오늘의 미션 하러 가기
        </PixelLink>
        <PixelLink href="/practice" variant="ghost">
          트랙 맵 보기
        </PixelLink>
      </div>
    </div>
  );
}
