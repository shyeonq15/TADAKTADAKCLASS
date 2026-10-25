"use client";

import { useEffect, useState } from "react";
import { BOSS, GAME_COINS, TRACK_LABELS, type Track } from "@/config/game";
import { startBoss, submitBoss } from "@/app/(student)/actions";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { COIN } from "@/components/pixel/sprites";
import { DialogBox } from "@/components/ui/DialogBox";
import { Loading } from "@/components/ui/Loading";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { StatCard } from "@/components/ui/StatCard";
import { RaceLanes } from "@/components/typing/RaceLanes";
import { TypingSession } from "@/components/typing/TypingSession";
import type { BossResult, BossSummary } from "@/lib/games/boss";
import { safeCall } from "@/lib/practice/call";
import { useSetPracticeData } from "@/lib/practice/store";
import { toSubmission } from "@/lib/practice/submission";

type Challenge = {
  bossId: string;
  title: string;
  track: Track;
  lines: string[];
  token: string;
  timeline: [number, number][];
  durationMs: number;
};

type Phase =
  | { name: "list" }
  | { name: "loading" }
  | { name: "countdown"; c: Challenge }
  | { name: "racing"; c: Challenge; start: number }
  | { name: "saving" }
  | { name: "result"; c: Challenge; r: BossResult }
  | { name: "error"; message: string };

/** 고스트 기록에서 지금 시각의 진행률 (0~1) */
function ghostProgress(timeline: [number, number][], total: number, ms: number) {
  let chars = 0;
  for (const [t, c] of timeline) {
    if (t > ms) break;
    chars = c;
  }
  return total ? chars / total : 0;
}

/** 3, 2, 1 카운트다운 */
function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    if (n === 0) {
      onDone();
      return;
    }
    const id = window.setTimeout(() => setN(n - 1), 800);
    return () => window.clearTimeout(id);
  }, [n, onDone]);
  return (
    <div className="flex flex-col items-center gap-4 bg-navy-900 px-6 py-16">
      <MissionLabel keyword="BOSS">보스가 나타났다!</MissionLabel>
      <p className="font-title text-[96px] leading-none text-yellow-400">{n || "GO!"}</p>
    </div>
  );
}

/** 레이스: 위에 나와 고스트 레인, 아래 타자 칸 */
function Race({ c, start, onFinish }: { c: Challenge; start: number; onFinish: (r: BossResult | { error: string }) => void }) {
  const setData = useSetPracticeData();
  const [now, setNow] = useState(start);
  const total = c.lines.reduce((n, l) => n + l.length, 0);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const ghost = ghostProgress(c.timeline, total, now - start);

  return (
    <TypingSession
      lines={c.lines}
      track={c.track}
      header={(stats) => (
        <RaceLanes
          lanes={[
            { id: "boss", name: "👾 선생님", progress: ghost, ghost: true, badge: ghost >= 1 ? "도착!" : undefined },
            { id: "me", name: "나", progress: stats.progress, me: true },
          ]}
        />
      )}
      onFinish={async (r) => {
        const res = await safeCall(() => submitBoss(toSubmission(c.token, c.lines, r)));
        if ("error" in res) return onFinish({ error: res.error ?? "" });
        setData(res.data);
        onFinish(res.result);
      }}
    />
  );
}

export function BossGame({ bosses }: { bosses: BossSummary[] }) {
  const [phase, setPhase] = useState<Phase>({ name: "list" });

  const challenge = async (b: BossSummary) => {
    setPhase({ name: "loading" });
    const res = await safeCall(() => startBoss(b.id));
    if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
    setPhase({
      name: "countdown",
      c: { bossId: b.id, title: res.title, track: res.track, lines: res.lines, token: res.token, timeline: res.timeline, durationMs: res.durationMs },
    });
  };

  if (phase.name === "list") {
    return (
      <RetroWindow title="보스전.exe" className="mx-auto w-full max-w-3xl">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 bg-navy-900 px-6 py-6 text-center">
            <p className="title-lime text-hero">보스전</p>
            <MissionLabel keyword="BOSS">선생님의 기록(고스트)보다 먼저 결승선에!</MissionLabel>
            <p className="font-pixel text-small text-sky-100">
              정확도 {BOSS.minAccuracy}% 이상으로 끝까지 치고, 고스트보다 빨리 들어오면 승리! 처음 이기면 코인 {GAME_COINS.bossWin}개 + 우리 반 지갑
              {GAME_COINS.bossClass}개.
            </p>
          </div>
          {bosses.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {bosses.map((b, i) => (
                <li key={b.id}>
                  <button
                    type="button"
                    autoFocus={i === 0}
                    onClick={() => challenge(b)}
                    className="win-bevel flex w-full items-center gap-3 px-3 py-3 text-left active:win-bevel-pressed"
                  >
                    <span className="text-[36px] leading-none">{b.defeated ? "🏆" : "👾"}</span>
                    <span className="flex-1 font-pixel text-body">
                      <strong>{b.title}</strong>
                      <br />
                      <span className="text-small text-text-muted">
                        {TRACK_LABELS[b.track]} · {b.lineCount}줄 · 보스 {Math.round(b.durationMs / 1000)}초
                      </span>
                    </span>
                    {b.defeated && <span className="bg-lime-400 px-2 font-pixel text-small">격파!</span>}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-pixel text-body">아직 보스가 없어요. 선생님이 보스를 만들면 여기에 나타나요!</p>
          )}
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "loading") return <Loading text="보스를 부르는 중..." />;
  if (phase.name === "saving") return <Loading text="결과를 확인하는 중..." />;

  if (phase.name === "error") {
    return (
      <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">{phase.message}</p>
        <PixelButton size="sm" variant="success" className="mt-4" autoFocus onClick={() => setPhase({ name: "list" })}>
          돌아가기
        </PixelButton>
      </RetroWindow>
    );
  }

  if (phase.name === "countdown") {
    const c = phase.c;
    return (
      <RetroWindow title={`보스전 - ${c.title}`} className="mx-auto w-full max-w-4xl">
        <Countdown onDone={() => setPhase({ name: "racing", c, start: Date.now() })} />
      </RetroWindow>
    );
  }

  if (phase.name === "racing") {
    const c = phase.c;
    return (
      <RetroWindow title={`보스전 - ${c.title} (${TRACK_LABELS[c.track]})`} className="mx-auto w-full max-w-4xl">
        <Race
          c={c}
          start={phase.start}
          onFinish={(r) => setPhase("error" in r ? { name: "error", message: r.error } : { name: "result", c, r })}
        />
      </RetroWindow>
    );
  }

  const { r, c } = phase;
  const messages = [
    r.suspicious ? "이번 기록은 선생님 확인 후에 반영돼요." : "",
    r.coins > 0 ? `코인 ${r.coins}개를 획득했다!` : "",
    r.classCoins > 0 ? `우리 반 지갑에 코인 ${r.classCoins}개가 쌓였다!` : "",
    r.firstWin ? `${c.title}를 처음으로 격파했다!` : "",
  ].filter(Boolean);
  const gap = Math.abs(r.durationMs - r.bossDurationMs) / 1000;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="text-center">
        <p className="title-lime text-hero">{r.win ? "BOSS CLEAR!" : "다음엔 꼭!"}</p>
        <p className="font-pixel text-body text-navy-900">
          {r.win
            ? `보스보다 ${gap.toFixed(1)}초 빨랐어요!`
            : !r.completed
              ? "끝까지 치면 보스와 승부할 수 있어요."
              : r.accuracy < BOSS.minAccuracy
                ? `정확도 ${BOSS.minAccuracy}% 이상이어야 이겨요. 천천히 정확하게!`
                : `보스와 ${gap.toFixed(1)}초 차이! 조금만 더!`}
        </p>
      </div>
      <RetroWindow title="보스전 결과">
        <div className="flex gap-2">
          <StatCard label="내 시간" value={`${(r.durationMs / 1000).toFixed(1)}초`} />
          <StatCard label="보스 시간" value={`${(r.bossDurationMs / 1000).toFixed(1)}초`} />
        </div>
        <div className="mt-2 flex gap-2">
          <StatCard label="타수" value={r.cpm} unit="타/분" />
          <StatCard label="정확도" value={`${r.accuracy}%`} />
        </div>
      </RetroWindow>
      {messages.length > 0 && (
        <div className="flex items-center gap-3">
          {r.coins > 0 && <PixelSprite sprite={COIN} scale={4} />}
          <div className="flex-1">
            <DialogBox key={messages.join("|")} text={messages.join(" ")} />
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <PixelButton
          variant="success"
          autoFocus
          onClick={() => {
            const b = { id: c.bossId } as BossSummary;
            void challenge(b);
          }}
        >
          ↻ 다시 도전
        </PixelButton>
        <PixelButton variant="ghost" onClick={() => setPhase({ name: "list" })}>
          보스 목록
        </PixelButton>
        <PixelLink href="/games" variant="ghost">
          게임 목록
        </PixelLink>
      </div>
    </div>
  );
}
