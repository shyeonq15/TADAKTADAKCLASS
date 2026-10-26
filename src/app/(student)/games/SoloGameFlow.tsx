"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type MutableRefObject, type ReactNode } from "react";
import { GAME_LABELS, TRACK_LABELS, TRACKS, type SoloGame, type Track } from "@/config/game";
import { startGame, submitGame } from "@/app/(student)/actions";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { COIN } from "@/components/pixel/sprites";
import { DialogBox } from "@/components/ui/DialogBox";
import { HelpButton } from "@/components/ui/HelpButton";
import { Loading } from "@/components/ui/Loading";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { StatCard } from "@/components/ui/StatCard";
import type { RainEvent } from "@/lib/games/rain";
import type { GameSave } from "@/lib/games/server";
import { safeCall } from "@/lib/practice/call";
import { usePracticeData, useSetPracticeData } from "@/lib/practice/store";

// 혼자 하는 게임 공통 흐름: 트랙 고르기 → 게임 → 서버가 점수 계산 → 결과

export type GameEnd = { events: RainEvent[]; durationMs: number; keyTimes: number[]; reason: "hearts" | "time" };
/** 지금까지의 기록 (게임이 이미 끝났으면 null). 부르면 그 판은 끝난 것으로 처리돼요 */
export type GameSnapshot = () => Omit<GameEnd, "reason"> | null;
export type FieldProps = { words: string[]; track: Track; onEnd: (r: GameEnd) => void; onSnapshot?: (fn: GameSnapshot) => void };

/**
 * 게임 중에 다른 메뉴로 나가거나 새로고침·창 닫기를 하면 그 자리에서 판을 끝내고 저장해요.
 * (나갔다 들어와서 하트를 다시 채우는 일이 없게. 화면이 사라지는 중이라 sendBeacon 으로 보냄)
 */
function useEndOnLeave(token: string | null, snapshot: MutableRefObject<GameSnapshot | null>) {
  useEffect(() => {
    if (!token) return;
    const send = () => {
      const snap = snapshot.current?.();
      if (!snap) return;
      const body = new Blob([JSON.stringify({ token, ...snap })], { type: "application/json" });
      navigator.sendBeacon("/api/games/abandon", body);
    };
    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [token, snapshot]);
}

type Props = {
  game: SoloGame;
  /** 게임 판 (단어 비 하늘, 토끼 달리기 길 …) */
  Field: ComponentType<FieldProps>;
  mission: string;
  rules: ReactNode[];
  help?: ReactNode;
  loadingText: string;
  /** 결과의 "맞힌 것" 이름 (터뜨린 단어, 넘은 장애물) */
  hitLabel: string;
};

type Phase =
  | { name: "select" }
  | { name: "loading" }
  | { name: "playing"; words: string[]; token: string }
  | { name: "saving" }
  | { name: "result"; save: GameSave; reason: "hearts" | "time" }
  | { name: "error"; message: string };

/* ───────── 전체 흐름 ───────── */

export function SoloGameFlow({ game, Field, mission, rules, help, loadingText, hitLabel }: Props) {
  const data = usePracticeData();
  const setData = useSetPracticeData();
  const [phase, setPhase] = useState<Phase>({ name: "select" });
  const [track, setTrack] = useState<Track>("korean");
  const snapshot = useRef<GameSnapshot | null>(null);
  const registerSnapshot = useCallback((fn: GameSnapshot) => {
    snapshot.current = fn;
  }, []);
  useEndOnLeave(phase.name === "playing" ? phase.token : null, snapshot);

  const bestOf = (t: Track) =>
    Math.max(0, ...data.attempts.filter((a) => a.kind === "game" && a.mode === game && a.track === t && !a.suspicious).map((a) => a.score ?? 0));

  const start = async (t: Track) => {
    setTrack(t);
    setPhase({ name: "loading" });
    const res = await safeCall(() => startGame(game, t));
    if ("error" in res) return setPhase({ name: "error", message: res.error });
    setPhase({ name: "playing", words: res.words, token: res.token });
  };

  if (phase.name === "select") {
    return (
      <RetroWindow title={`${GAME_LABELS[game]}.exe`} className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col items-center gap-4 bg-navy-900 px-6 py-8 text-center">
          <p className="title-lime text-hero">{GAME_LABELS[game]}</p>
          <MissionLabel keyword="MISSION">{mission}</MissionLabel>
          <ul className="font-pixel text-small leading-6 text-sky-100">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-4">
            {TRACKS.map((t, i) => (
              <PixelButton key={t} variant={i === 0 ? "success" : "ghost"} autoFocus={i === 0} onClick={() => start(t)}>
                <span className="flex flex-col leading-tight">
                  {TRACK_LABELS[t]}
                  <span className="text-small font-normal">최고 {bestOf(t)}점</span>
                </span>
              </PixelButton>
            ))}
          </div>
          <p className="flex items-center gap-2 font-pixel text-small text-sky-100">
            지금 단계의 글 난이도까지 단어가 나와요.
            {help && <HelpButton title={`${GAME_LABELS[game]} 규칙`}>{help}</HelpButton>}
          </p>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "loading") return <Loading text={loadingText} />;
  if (phase.name === "saving") return <Loading text="점수를 계산하는 중..." />;

  if (phase.name === "error") {
    return (
      <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">{phase.message}</p>
        <PixelButton size="sm" variant="success" className="mt-4" autoFocus onClick={() => setPhase({ name: "select" })}>
          돌아가기
        </PixelButton>
      </RetroWindow>
    );
  }

  if (phase.name === "playing") {
    const token = phase.token;
    return (
      <RetroWindow title={`${GAME_LABELS[game]} - ${TRACK_LABELS[track]}`} className="mx-auto w-full max-w-4xl">
        <Field
          words={phase.words}
          track={track}
          onSnapshot={registerSnapshot}
          onEnd={async ({ events, durationMs, keyTimes, reason }) => {
            setPhase({ name: "saving" });
            const res = await safeCall(() => submitGame({ token, events, durationMs, keyTimes }));
            if ("error" in res) return setPhase({ name: "error", message: res.error });
            setData(res.data);
            setPhase({ name: "result", save: res.save, reason });
          }}
        />
      </RetroWindow>
    );
  }

  // 결과
  const { save, reason } = phase;
  const r = save.result;
  const before = save.before;
  const messages = [
    save.attempt.suspicious ? "이번 기록은 선생님 확인 후에 반영돼요." : "",
    save.coins > 0 ? `코인 ${save.coins}개를 획득했다!` : "",
    save.newBest ? "최고 점수를 갱신했다!" : "",
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="text-center">
        <p className="title-lime text-hero">{save.newBest ? "NEW RECORD!" : reason === "time" ? "TIME UP!" : "GAME OVER"}</p>
        <p className="font-pixel text-body text-navy-900">
          {reason === "time" ? "끝까지 버텼어요! 대단해요." : "다음엔 더! 한 번 더 해 볼까요?"}
        </p>
      </div>
      <RetroWindow title={`${GAME_LABELS[game]} 결과`}>
        <div className="flex gap-2">
          <StatCard label="점수" value={r.score} />
          <StatCard label={hitLabel} value={r.hits} unit="개" />
          <StatCard label="최고 콤보" value={r.maxCombo} />
        </div>
        <div className="mt-2 flex gap-2">
          <StatCard
            label="타수"
            value={save.attempt.cpm}
            unit="타/분"
            diff={before ? { value: Math.round(save.attempt.cpm - before.cpm), unit: "타" } : null}
          />
          <StatCard label="정확도" value={`${save.attempt.accuracy}%`} />
          <StatCard label="내 최고 점수" value={save.best} />
        </div>
        <p className="mt-3 font-pixel text-small text-text-muted">
          {before ? `▲▼ 는 최근 ${GAME_LABELS[game]} 5판의 가운데 값(${Math.round(before.cpm)}타)과 비교한 거예요.` : "첫 판이에요! 다음 판부터 내 기록과 비교해 줄게요."}
        </p>
      </RetroWindow>
      {messages.length > 0 && (
        <div className="flex items-center gap-3">
          {save.coins > 0 && <PixelSprite sprite={COIN} scale={4} />}
          <div className="flex-1">
            <DialogBox key={messages.join("|")} text={messages.join(" ")} />
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <PixelButton variant="success" autoFocus onClick={() => start(track)}>
          ↻ 한 판 더
        </PixelButton>
        <PixelButton variant="ghost" onClick={() => setPhase({ name: "select" })}>
          트랙 바꾸기
        </PixelButton>
        <PixelLink href="/games" variant="ghost">
          게임 목록
        </PixelLink>
      </div>
    </div>
  );
}
