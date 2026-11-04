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
import { RaceLanes } from "./RaceLanes";
import { linesKeystrokes } from "@/lib/typing/engine";
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
  /** 내 고스트와 레이스: 이 타수(내 최고 기록)로 달리는 고스트를 위에 보여 줘요 */
  ghostCpm?: number | null;
  /**
   * 이어 읽기 (교과 탐험): 바로 앞 지문의 끝과 다음 지문의 시작을 타자 칸 위아래에 흐리게 보여 줘요.
   * 타자 칸(TypingArea)은 그대로 두고 바깥에만 그려요. step: 글 전체에서 몇 번째 지문인지
   */
  context?: { before: string[]; after: string[]; step?: { n: number; total: number } };
};

/** 글자 수로 자르기 (앞 내용은 끝부분, 다음 내용은 앞부분) */
const CONTEXT_CHARS = 48;
const tail = (s: string) => (s.length > CONTEXT_CHARS ? `…${s.slice(-CONTEXT_CHARS)}` : s);
const head = (s: string) => (s.length > CONTEXT_CHARS ? `${s.slice(0, CONTEXT_CHARS)}…` : s);

/**
 * 이어 읽기: 타자 칸 아래 "글의 흐름" 상자 하나에 앞 내용 끝과 다음 내용 시작을 한 줄씩.
 * 타자 글씨(D2Coding)가 아닌 보통 글씨로 써서, 쳐야 하는 글과 헷갈리지 않게 해요.
 */
function ContextBox({ before, after }: { before: string[]; after: string[] }) {
  if (!before.length && !after.length) return null;
  const row = (label: string, text: string) => (
    <p className="flex gap-2">
      <span className="shrink-0 border-2 border-navy-900 bg-paper px-1 font-bold text-navy-900">{label}</span>
      <span className="truncate">{text}</span>
    </p>
  );
  return (
    <div className="mt-3 border-2 border-dashed border-navy-900 bg-surface px-3 py-2 font-pixel text-small text-text-muted">
      <p className="mb-1 font-bold text-navy-900">📖 글의 흐름 (치지 않아도 돼요)</p>
      {before.length > 0 && row("◀ 앞 내용", tail(before.join(" ")))}
      {after.length > 0 && row("다음 ▶", head(after.join(" ")))}
    </div>
  );
}

type Phase =
  | { name: "ready" }
  | { name: "loading" }
  | { name: "explain"; lines: string[]; token: string; note: CodeNote; mask?: Mask }
  | { name: "typing"; lines: string[]; token: string; note?: CodeNote; mask?: Mask; code?: boolean }
  | { name: "saving" }
  | { name: "quiz"; save: SaveResult; lines: string[]; note: CodeNote; choices: string[] }
  | { name: "result"; save: SaveResult }
  | { name: "error"; message: string };

/** 한 판 진행: 준비(PRESS START) → 서버에서 지문 받기 → 타자 → 서버가 채점·저장 → 결과 */
export function RoundRunner({ request, title, subtitle, actions, autoStart, onSaved, ghostCpm, context }: Props) {
  const setData = useSetPracticeData();
  const [phase, setPhase] = useState<Phase>(() => (autoStart ? { name: "loading" } : { name: "ready" }));
  const autoStarted = useRef(false);
  const track = request.track;

  const fetchRound = async () => {
    const res = await safeCall(() => startRound(request));
    if ("error" in res) return setPhase({ name: "error", message: res.error });
    // 코드면 설명 카드부터
    if (res.note) setPhase({ name: "explain", lines: res.lines, token: res.token, note: res.note, mask: res.mask });
    else setPhase({ name: "typing", lines: res.lines, token: res.token, code: res.code });
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
        {context?.step && (
          <div className="mb-2 flex items-center gap-2 font-pixel text-small text-navy-900">
            <span>
              📖 {context.step.n} / {context.step.total}
            </span>
            <div className="win-bevel-pressed h-3 flex-1 bg-paper">
              <div className="h-full bg-lime-400" style={{ width: `${((context.step.n - 1) / context.step.total) * 100}%` }} />
            </div>
          </div>
        )}
        <TypingSession
          key={phase.token}
          lines={phase.lines}
          track={track}
          code={phase.code}
          mask={phase.mask}
          codeHint={phase.note ? (i) => <CodeHint note={phase.note!} lineIndex={i} mask={phase.mask} /> : undefined}
          header={
            ghostCpm
              ? (stats) => {
                  // 고스트는 내 최고 타수로 일정하게 달려요. 둘 다 "친 타수 ÷ 전체 타수"로 비교
                  const total = Math.max(1, linesKeystrokes(phase.lines, phase.lines, !!(phase.code ?? track === "code"), phase.lines.length));
                  return (
                    <RaceLanes
                      lanes={[
                        { id: "ghost", name: `👻 내 최고 ${ghostCpm}타`, progress: (stats.elapsedMs / 60000) * ghostCpm / total, ghost: true },
                        { id: "me", name: "나", progress: stats.keystrokes / total, me: true },
                      ]}
                    />
                  );
                }
              : undefined
          }
          onFinish={(r) => handleFinish(phase.lines, phase.token, r, phase.note)}
        />
        {context && <ContextBox before={context.before} after={context.after} />}
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
