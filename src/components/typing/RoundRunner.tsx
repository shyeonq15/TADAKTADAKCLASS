"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TRACK_LABELS } from "@/config/game";
import { startRound, submitRound } from "@/app/(student)/actions";
import { Loading } from "@/components/ui/Loading";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { useSetPracticeData, type SaveResult } from "@/lib/practice/store";
import { safeCall } from "@/lib/practice/call";
import { toSubmission } from "@/lib/practice/submission";
import type { RoundRequest } from "@/lib/practice/types";
import type { CodeNote } from "@/data/codeNotes";
import { CodeExplainCard, CodeHint, CodeQuizCard, quizChoices } from "./CodeCards";
import { ResultPanel } from "./ResultPanel";
import type { Mask } from "./TypingArea";
import { TypingSession, type SessionResult } from "./TypingSession";

type Props = {
  request: RoundRequest;
  title: string;
  subtitle?: string;
  /** 결과 화면 버튼. 기본: 다시 하기 */
  actions?: (save: SaveResult, retry: () => void) => ReactNode;
  /** 준비 화면 없이 바로 시작 (미션 2판째부터) */
  autoStart?: boolean;
  /** 결과 화면 대신 바로 다음으로 넘길 때 */
  onSaved?: (save: SaveResult) => void;
};

type Phase =
  | { name: "ready" }
  | { name: "loading" }
  | { name: "explain"; lines: string[]; token: string; note: CodeNote; mask?: Mask }
  | { name: "typing"; lines: string[]; token: string; note?: CodeNote; mask?: Mask }
  | { name: "saving" }
  | { name: "quiz"; save: SaveResult; lines: string[]; note: CodeNote; choices: string[] }
  | { name: "result"; save: SaveResult }
  | { name: "error"; message: string };

/** 한 판 진행: 준비(PRESS START) → 서버에서 지문 받기 → 타자 → 서버가 채점·저장 → 결과 */
export function RoundRunner({ request, title, subtitle, actions, autoStart, onSaved }: Props) {
  const setData = useSetPracticeData();
  const [phase, setPhase] = useState<Phase>(() => (autoStart ? { name: "loading" } : { name: "ready" }));
  const autoStarted = useRef(false);
  const track = request.track;

  const fetchRound = async () => {
    const res = await safeCall(() => startRound(request));
    if ("error" in res) return setPhase({ name: "error", message: res.error });
    // 코드면 설명 카드부터
    if (res.note) setPhase({ name: "explain", lines: res.lines, token: res.token, note: res.note, mask: res.mask });
    else setPhase({ name: "typing", lines: res.lines, token: res.token });
  };

  const start = () => {
    setPhase({ name: "loading" });
    void fetchRound();
  };

  // 미션 2판째부터는 바로 시작 (개발 모드에서 두 번 불리지 않게 막음)
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    void fetchRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishSave = (save: SaveResult) => {
    if (onSaved) onSaved(save);
    else setPhase({ name: "result", save });
  };

  const handleFinish = async (lines: string[], token: string, r: SessionResult, note?: CodeNote) => {
    setPhase({ name: "saving" });
    const res = await safeCall(() => submitRound(toSubmission(token, lines, r)));
    if ("error" in res) return setPhase({ name: "error", message: res.error });
    setData(res.data);
    // 코드면 결과 맞히기 퀴즈를 거쳐서
    if (note) setPhase({ name: "quiz", save: res.save, lines, note, choices: quizChoices(note) });
    else finishSave(res.save);
  };

  const windowTitle = `${TRACK_LABELS[track]} - ${title}`;

  if (phase.name === "ready") {
    return (
      <RetroWindow title={windowTitle} className="mx-auto w-full max-w-xl">
        <div className="flex flex-col items-center gap-5 bg-navy-900 px-6 py-10 text-center">
          <MissionLabel keyword="MISSION">{subtitle ?? title}</MissionLabel>
          <p className="blink font-title text-hero text-sky-200">PRESS START</p>
          <PixelButton variant="success" autoFocus onClick={start}>
            ▶ 시작하기 (Enter)
          </PixelButton>
          <p className="font-pixel text-small text-sky-100">손가락을 기본 자리(ㅁㄴㅇㄹ / asdf)에 올려 두세요.</p>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "loading" || phase.name === "saving") {
    return <Loading text={phase.name === "loading" ? "지문을 가져오는 중..." : "기록을 저장하는 중..."} />;
  }

  if (phase.name === "error") {
    return (
      <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">{phase.message}</p>
        <div className="mt-4">
          <PixelButton size="sm" variant="success" autoFocus onClick={start}>
            다시 시작하기
          </PixelButton>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "explain") {
    const { lines, token, note, mask } = phase;
    return <CodeExplainCard lines={lines} note={note} mask={mask} onStart={() => setPhase({ name: "typing", lines, token, note, mask })} />;
  }

  if (phase.name === "quiz") {
    return <CodeQuizCard lines={phase.lines} note={phase.note} choices={phase.choices} onDone={() => finishSave(phase.save)} />;
  }

  if (phase.name === "typing") {
    return (
      <RetroWindow title={windowTitle} className="mx-auto w-full max-w-4xl">
        <TypingSession
          key={phase.token}
          lines={phase.lines}
          track={track}
          mask={phase.mask}
          codeHint={phase.note ? (i) => <CodeHint note={phase.note!} lineIndex={i} mask={phase.mask} /> : undefined}
          onFinish={(r) => handleFinish(phase.lines, phase.token, r, phase.note)}
        />
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
