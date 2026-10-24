"use client";

import { useState, type ReactNode } from "react";
import { TRACK_LABELS, type Track } from "@/config/game";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { saveAttempt, type Attempt, type AttemptKind, type SaveResult } from "@/lib/practice/store";
import { ResultPanel } from "./ResultPanel";
import { TypingSession, type SessionResult } from "./TypingSession";

type Props = {
  track: Track;
  level: number;
  mode: Attempt["mode"];
  kind: AttemptKind;
  title: string;
  subtitle?: string;
  /** 시작할 때마다 새 지문을 만듦 (화면 첫 렌더에서 무작위를 쓰지 않으려고 함수로 받음) */
  buildLines: () => string[];
  /** 결과 화면 버튼. 기본: 다시 하기 */
  actions?: (save: SaveResult, retry: () => void) => ReactNode;
  /** 준비 화면 없이 바로 시작 (미션 2판째부터) */
  autoStart?: boolean;
  /** 결과 화면 대신 바로 다음으로 넘길 때 */
  onSaved?: (save: SaveResult) => void;
};

type Phase = { name: "ready" } | { name: "typing"; lines: string[]; round: number } | { name: "result"; save: SaveResult };

/** 한 판 진행: 준비(PRESS START) → 타자 → 결과 */
export function RoundRunner({ track, level, mode, kind, title, subtitle, buildLines, actions, autoStart, onSaved }: Props) {
  const [phase, setPhase] = useState<Phase>(() =>
    autoStart ? { name: "typing", lines: buildLines(), round: 0 } : { name: "ready" },
  );

  const start = () => setPhase((p) => ({ name: "typing", lines: buildLines(), round: p.name === "typing" ? p.round + 1 : 0 }));

  const handleFinish = (r: SessionResult) => {
    const save = saveAttempt({
      kind,
      track,
      level,
      mode,
      cpm: r.stats.cpm,
      accuracy: r.stats.accuracy,
      keystrokes: r.stats.keystrokes,
      durationMs: r.stats.elapsedMs,
      missedKeys: r.missedKeys,
      flags: r.flags,
    });
    if (onSaved) onSaved(save);
    else setPhase({ name: "result", save });
  };

  if (phase.name === "ready") {
    return (
      <RetroWindow title={`${TRACK_LABELS[track]} - ${title}`} className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-5 bg-navy-900 px-6 py-10 text-center">
          <MissionLabel keyword="MISSION">{subtitle ?? title}</MissionLabel>
          <p className="font-title text-hero text-sky-200 blink">PRESS START</p>
          <PixelButton variant="success" autoFocus onClick={start}>
            ▶ 시작하기 (Enter)
          </PixelButton>
          <p className="font-pixel text-small text-sky-100">손가락을 기본 자리(ㅁㄴㅇㄹ / asdf)에 올려 두세요.</p>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "typing") {
    return (
      <RetroWindow title={`${TRACK_LABELS[track]} - ${title}`} className="mx-auto w-full max-w-4xl">
        <TypingSession key={phase.round} lines={phase.lines} track={track} onFinish={handleFinish} />
      </RetroWindow>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <ResultPanel
        save={phase.save}
        actions={
          actions ? (
            actions(phase.save, start)
          ) : (
            <PixelButton variant="success" autoFocus onClick={start}>
              ↻ 다시 하기
            </PixelButton>
          )
        }
      />
    </div>
  );
}
