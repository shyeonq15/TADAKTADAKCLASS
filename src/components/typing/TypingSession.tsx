"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/config/game";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { StatCard } from "@/components/ui/StatCard";
import {
  applyInput,
  createSession,
  finishSession,
  imeHint,
  isFinished,
  recordKey,
  sessionStats,
  type SessionState,
  type SessionStats,
} from "@/lib/typing/engine";
import { checkIntegrity, type IntegrityFlag } from "@/lib/typing/integrity";
import { TypingArea } from "./TypingArea";

export type SessionResult = {
  stats: SessionStats;
  missedKeys: Record<string, number>;
  flags: IntegrityFlag[];
  /** 서버가 다시 계산할 수 있게 넘기는 원본 (친 내용, 키 시각) */
  state: SessionState;
};

type Props = {
  lines: readonly string[];
  track: Track;
  /** 제한 시간(초). 배치 테스트처럼 시간이 다 되면 끝 */
  timeLimitSec?: number;
  onFinish: (result: SessionResult) => void;
};

const fmtTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** 실시간 타수·정확도·진행률 + TypingArea. 한 판이 끝나면 onFinish를 한 번 부릅니다. */
export function TypingSession({ lines, track, timeLimitSec, onFinish }: Props) {
  const code = track === "code";
  const [session, setSession] = useState<SessionState>(() => createSession(lines, { autoIndent: code }));
  const [now, setNow] = useState(() => Date.now());
  const [blockedAt, setBlockedAt] = useState(0);
  const ref = useRef(session);
  const finishedRef = useRef(false);

  const finish = (s: SessionState) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const stats = sessionStats(s, Date.now());
    onFinish({ stats, missedKeys: s.missedKeys, flags: checkIntegrity(track, stats.cpm, s.keyTimes), state: s });
  };

  const update = (next: SessionState) => {
    ref.current = next;
    setSession(next);
    if (isFinished(next)) finish(next);
  };

  // 치는 동안 숫자 갱신 + 제한 시간 확인
  const running = session.startedAt !== null && !isFinished(session);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const s = ref.current;
      if (timeLimitSec && s.startedAt !== null && t - s.startedAt >= timeLimitSec * 1000 && !isFinished(s)) {
        update(finishSession(s, s.startedAt + timeLimitSec * 1000));
      }
    }, 250);
    return () => window.clearInterval(id);
    // update는 ref만 쓰므로 의존성에서 뺌
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timeLimitSec]);

  const stats = sessionStats(session, now);
  const hint = imeHint(session);
  const remainingMs = timeLimitSec ? Math.max(0, timeLimitSec * 1000 - stats.elapsedMs) : null;
  const showBlocked = blockedAt > 0 && now - blockedAt < 2500;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <StatCard label="타수" value={stats.cpm} unit="타/분" />
        <StatCard label="정확도" value={`${stats.accuracy}%`} />
        <StatCard
          label={remainingMs !== null ? "남은 시간" : "시간"}
          value={fmtTime(remainingMs ?? stats.elapsedMs)}
        />
      </div>
      <PixelProgressBar value={stats.progress} label="진행률" />

      <TypingArea
        session={session}
        code={code}
        onInput={(value, composing) => {
          const r = applyInput(ref.current, value, composing, Date.now());
          if (r.blocked) setBlockedAt(Date.now());
          update(r.state);
          setNow(Date.now());
        }}
        onKey={() => update(recordKey(ref.current, Date.now()))}
        onBlocked={() => {
          setBlockedAt(Date.now());
          setNow(Date.now());
        }}
        disabled={isFinished(session)}
      />

      <div className="min-h-10" aria-live="polite">
        {hint && (
          <p className="inline-block bg-ink px-3 py-2 font-pixel text-body text-paper">
            <strong className="mr-2 text-yellow-400">한/영</strong>
            한/영 키를 확인하세요 · 지금은 {hint === "korean" ? "한글" : "영어"}로 쳐야 해요
          </p>
        )}
        {showBlocked && (
          <p className="inline-block bg-ink px-3 py-2 font-pixel text-body text-paper">
            붙여넣기는 할 수 없어요. 직접 쳐 볼까요?
          </p>
        )}
        {!hint && !showBlocked && session.startedAt === null && (
          <p className="font-pixel text-body text-navy-900">
            {code ? "줄 끝에서 Enter를 누르면 다음 줄로 가요. 들여쓰기는 자동으로 채워져요." : "줄 끝에서 Space나 Enter를 누르면 다음 줄로 가요."}
          </p>
        )}
      </div>
    </div>
  );
}
