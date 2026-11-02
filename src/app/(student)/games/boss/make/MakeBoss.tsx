"use client";

import { useRef, useState } from "react";
import { STUDENT_BOSS, TIER_LABELS, TRACK_LABELS, TRACKS, type Tier, type Track } from "@/config/game";
import { saveMyBoss, startStudentBoss } from "@/app/(student)/actions";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { TypingSession } from "@/components/typing/TypingSession";
import { safeCall } from "@/lib/practice/call";
import { getStage, stageName, tierOfStage } from "@/lib/practice/stages";
import { usePracticeData, useSetPracticeData } from "@/lib/practice/store";
import { toSubmission } from "@/lib/practice/submission";
import { TIERS } from "@/config/game";
import { useOnHide } from "@/lib/games/useOnHide";

type Phase =
  | { name: "setup" }
  | { name: "typing"; lines: string[]; token: string }
  | { name: "done"; cpm: number; accuracy: number; durationMs: number; tier: Tier }
  | { name: "error"; message: string };

const canMake = (stage: number) => TIERS.indexOf(tierOfStage(stage)) >= TIERS.indexOf(STUDENT_BOSS.minTier);

/** 레전드 이상 학생이 한 판 쳐서 내 보스를 만들어요. 상금은 내 코인에서 걸어요 */
export function MakeBoss() {
  const { progress } = usePracticeData();
  const setData = useSetPracticeData();
  const tracks = TRACKS.filter((t) => canMake(progress.unlocked[t]));
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [track, setTrack] = useState<Track>(tracks[0] ?? "korean");
  const [stage, setStage] = useState(progress.unlocked[tracks[0] ?? "korean"]);
  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState<number>(STUDENT_BOSS.minPrize);
  const timeline = useRef<[number, number][]>([]);
  // 치다가 다른 메뉴로 가면 처음부터 (멈춘 판이 다시 움직이지 않게)
  useOnHide(() => {
    if (phase.name === "typing") setPhase({ name: "error", message: "다른 화면으로 가서 기록이 멈췄어요. 다시 해 주세요." });
  });

  if (tracks.length === 0) {
    return (
      <RetroWindow title="내 보스 만들기" className="mx-auto w-full max-w-lg">
        <p className="font-pixel text-body">
          보스는 그 트랙 <strong>{TIER_LABELS[STUDENT_BOSS.minTier]} 이상</strong>이 되면 만들 수 있어요. 연습 트랙에서 조금만 더 힘내요!
        </p>
        <PixelLink href="/games/boss" size="sm" variant="ghost" className="mt-4">
          보스전으로
        </PixelLink>
      </RetroWindow>
    );
  }

  const start = async () => {
    timeline.current = [];
    const res = await safeCall(() => startStudentBoss(track, stage, title, prize));
    if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
    setPhase({ name: "typing", lines: res.lines, token: res.token });
  };

  if (phase.name === "setup" || phase.name === "error") {
    const prizes: number[] = [];
    for (let p = STUDENT_BOSS.minPrize; p <= Math.min(STUDENT_BOSS.maxPrize, progress.coins); p += STUDENT_BOSS.prizeStep) prizes.push(p);
    return (
      <RetroWindow title="내 보스 만들기" className="mx-auto w-full max-w-2xl">
        <div className="flex flex-col gap-4 font-pixel text-body text-navy-900">
          <div className="flex flex-col items-center gap-2 bg-navy-900 px-4 py-5 text-center">
            <MissionLabel keyword="BOSS">내 기록이 친구들의 보스가 된다!</MissionLabel>
            <p className="text-small text-sky-100">
              끝까지, 정확도 {STUDENT_BOSS.minAccuracy}% 이상으로 치면 내 고스트가 보스가 돼요. 상금은 내 코인에서 걸고, 처음 이긴 친구{" "}
              {STUDENT_BOSS.winners}명이 상금의 1/{STUDENT_BOSS.winners}씩 가져가요. 트랙마다 1마리 (새로 만들면 예전 보스는 내려가고 남은 상금은 돌려받아요).
            </p>
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-bold">보스 이름 (2~20글자)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={20}
              placeholder="예: 타닥 번개의 도전장"
              className="win-bevel-pressed h-10 bg-paper px-2 outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <fieldset className="flex flex-col gap-1">
              <legend className="font-bold">트랙 ({TIER_LABELS[STUDENT_BOSS.minTier]} 이상만)</legend>
              <div className="flex gap-1">
                {tracks.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setTrack(t);
                      setStage(progress.unlocked[t]);
                    }}
                    className={`win-bevel h-10 px-3 ${track === t ? "win-bevel-pressed bg-paper font-bold" : ""}`}
                  >
                    {TRACK_LABELS[t]}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className="font-bold">글 (열린 단계)</span>
              <select value={stage} onChange={(e) => setStage(Number(e.target.value))} className="win-bevel-pressed h-10 bg-paper px-2">
                {Array.from({ length: progress.unlocked[track] }, (_, i) => progress.unlocked[track] - i).map((n) => (
                  <option key={n} value={n}>
                    {stageName(n)} · {getStage(track, n)?.level.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-bold">상금 (내 코인 {progress.coins})</span>
              {prizes.length ? (
                <select value={prize} onChange={(e) => setPrize(Number(e.target.value))} className="win-bevel-pressed h-10 bg-paper px-2">
                  {prizes.map((p) => (
                    <option key={p} value={p}>
                      {p}코인 (한 명당 {Math.floor(p / STUDENT_BOSS.winners)}코인)
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-red-500">코인이 {STUDENT_BOSS.minPrize}개 이상 있어야 해요.</span>
              )}
            </label>
          </div>
          {phase.name === "error" && <p className="text-red-500">{phase.message}</p>}
          <div className="flex gap-2">
            <PixelButton variant="success" onClick={start} disabled={!prizes.length || title.trim().length < 2}>
              ▶ 기록 시작
            </PixelButton>
            <PixelLink href="/games/boss" variant="ghost">
              보스전으로
            </PixelLink>
          </div>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "typing") {
    return (
      <RetroWindow title={`내 보스 기록 중 - ${TRACK_LABELS[track]}`} className="mx-auto w-full max-w-4xl">
        <TypingSession
          lines={phase.lines}
          track={track}
          onProgress={(done, ms) => {
            const last = timeline.current.at(-1);
            if (!last || last[1] !== done) timeline.current.push([ms, done]);
          }}
          onFinish={async (r) => {
            const sub = { ...toSubmission(phase.token, phase.lines, r), timeline: timeline.current };
            const res = await safeCall(() => saveMyBoss(sub));
            if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
            if ("data" in res && res.data) setData(res.data);
            setPhase({ name: "done", cpm: res.cpm, accuracy: res.accuracy, durationMs: res.durationMs, tier: res.tier });
          }}
        />
      </RetroWindow>
    );
  }

  return (
    <RetroWindow title="보스 완성!" className="mx-auto w-full max-w-lg">
      <p className="font-pixel text-heading text-navy-900">
        👾 내 보스가 나타났다! <TierBadge tier={phase.tier} />
      </p>
      <p className="mt-2 font-pixel text-body">
        {phase.cpm}타 · 정확도 {phase.accuracy}% · {Math.round(phase.durationMs / 1000)}초. 같은 학년 친구들의 보스 목록에 나타나요.
      </p>
      <div className="mt-4 flex gap-2">
        <PixelLink href="/games/boss" variant="success" size="sm">
          보스 목록
        </PixelLink>
      </div>
    </RetroWindow>
  );
}
