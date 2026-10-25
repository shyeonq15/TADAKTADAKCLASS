"use client";

import { useState } from "react";
import { PLACEMENT, TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { getLevel } from "@/data/packs";
import { startRound, submitPlacement, submitRound } from "@/app/(student)/actions";
import { Loading } from "@/components/ui/Loading";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TypingSession, type SessionResult } from "@/components/typing/TypingSession";
import { usePracticeData, useSetPracticeData } from "@/lib/practice/store";
import { toSubmission } from "@/lib/practice/submission";

type Phase =
  | { name: "ready"; index: number }
  | { name: "loading"; index: number }
  | { name: "typing"; index: number; lines: string[]; token: string }
  | { name: "done"; cpm: Record<Track, number>; start: Record<Track, number> }
  | { name: "error"; index: number; message: string };

/** 첫 접속 배치 테스트 (PRD P5): 트랙마다 30초씩, 2분. 학생마다 한 번만 */
export function PlacementRun() {
  const { progress } = usePracticeData();
  const setData = useSetPracticeData();
  const [phase, setPhase] = useState<Phase>({ name: "ready", index: 0 });

  // 이미 했으면 결과만 보여줌
  if (progress.placement && phase.name !== "done") {
    return <Done cpm={progress.placement} start={progress.unlocked} already />;
  }

  const begin = async (index: number) => {
    setPhase({ name: "loading", index });
    const res = await startRound({ kind: "placement", track: TRACKS[index] });
    if ("error" in res) return setPhase({ name: "error", index, message: res.error });
    setPhase({ name: "typing", index, lines: res.lines, token: res.token });
  };

  const onFinish = async (index: number, lines: string[], token: string, r: SessionResult) => {
    setPhase({ name: "loading", index });
    const saved = await submitRound(toSubmission(token, lines, r));
    if ("error" in saved) return setPhase({ name: "error", index, message: saved.error });
    if (index + 1 < TRACKS.length) return setPhase({ name: "ready", index: index + 1 });

    const res = await submitPlacement();
    if ("data" in res) setData(res.data);
    if ("error" in res) return setPhase({ name: "error", index, message: res.error ?? "" });
    setPhase({ name: "done", cpm: res.cpm, start: res.start });
  };

  if (phase.name === "loading") return <Loading text="잠깐만요..." />;

  if (phase.name === "error") {
    return (
      <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">{phase.message}</p>
        <PixelButton size="sm" variant="success" className="mt-4" autoFocus onClick={() => begin(phase.index)}>
          다시 하기
        </PixelButton>
      </RetroWindow>
    );
  }

  if (phase.name === "ready") {
    const track = TRACKS[phase.index];
    return (
      <RetroWindow title="배치 테스트.exe" className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-5 bg-navy-900 px-6 py-10 text-center">
          <MissionLabel keyword="NEW">
            배치 테스트 {phase.index + 1} / {TRACKS.length}
          </MissionLabel>
          <p className="font-title text-title text-sky-200">
            {TRACK_LABELS[track]} {PLACEMENT.secondsPerTrack}초
          </p>
          <p className="font-pixel text-body text-sky-100">
            {phase.index === 0
              ? "내 실력에 맞는 레벨을 찾아 줄게요. 트랙마다 30초씩, 끝까지 못 쳐도 괜찮아요!"
              : `한/영 키를 ${track === "korean" ? "한글" : "영어"}로 맞췄는지 확인해요.`}
          </p>
          <PixelButton variant="success" autoFocus onClick={() => begin(phase.index)}>
            ▶ 시작 (Enter)
          </PixelButton>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "typing") {
    const track = TRACKS[phase.index];
    return (
      <RetroWindow title={`배치 테스트 - ${TRACK_LABELS[track]}`} className="mx-auto w-full max-w-4xl">
        <TypingSession
          key={track}
          lines={phase.lines}
          track={track}
          timeLimitSec={PLACEMENT.secondsPerTrack}
          onFinish={(r) => onFinish(phase.index, phase.lines, phase.token, r)}
        />
      </RetroWindow>
    );
  }

  return <Done cpm={phase.cpm} start={phase.start} />;
}

function Done({ cpm, start, already }: { cpm: Record<Track, number>; start: Record<Track, number>; already?: boolean }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5">
      <p className="title-lime text-hero">READY!</p>
      <RetroWindow title="배치 결과" className="w-full">
        <table className="w-full font-sans text-body">
          <thead>
            <tr className="border-b-2 border-navy-900 text-left">
              <th className="py-1">트랙</th>
              <th className="py-1 text-right">타수</th>
              <th className="py-1 text-right">{already ? "지금 열린 레벨" : "시작 레벨"}</th>
            </tr>
          </thead>
          <tbody>
            {TRACKS.map((t) => (
              <tr key={t} className="border-b border-win-shadow">
                <td className="py-1">{TRACK_LABELS[t]}</td>
                <td className="py-1 text-right">{cpm[t]}타</td>
                <td className="py-1 text-right font-bold">
                  레벨 {start[t]} · {getLevel(t, start[t])?.title}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 font-pixel text-small text-text-muted">
          {already
            ? "배치 테스트는 한 번만 해요. 이제부터는 어제의 나와 비교해요!"
            : "이 기록이 성장 점수의 첫 기준값이 돼요. 이제부터는 어제의 나와 비교해요!"}
        </p>
      </RetroWindow>
      <div className="flex gap-3">
        <PixelLink href="/mission" variant="success" autoFocus>
          오늘의 미션 하러 가기
        </PixelLink>
        <PixelLink href="/" variant="ghost">
          홈으로
        </PixelLink>
      </div>
    </div>
  );
}
