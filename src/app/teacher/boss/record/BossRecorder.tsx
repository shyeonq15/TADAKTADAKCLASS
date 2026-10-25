"use client";

import { useRef, useState } from "react";
import { TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TypingSession } from "@/components/typing/TypingSession";
import { safeCall } from "@/lib/practice/call";
import { STAGE_COUNT, getStage, stageName } from "@/lib/practice/stages";
import { toSubmission } from "@/lib/practice/submission";
import { saveBoss, startBossRecording } from "../actions";

type Phase =
  | { name: "setup" }
  | { name: "typing"; lines: string[]; token: string }
  | { name: "done"; cpm: number; accuracy: number; durationMs: number }
  | { name: "error"; message: string };

/** 선생님이 한 판 쳐서 보스 고스트를 만듦 (언제 몇 글자 쳤는지 기록) */
export function BossRecorder() {
  const [phase, setPhase] = useState<Phase>({ name: "setup" });
  const [track, setTrack] = useState<Track>("korean");
  const [stage, setStage] = useState(11);
  const [title, setTitle] = useState("");
  const timeline = useRef<[number, number][]>([]);

  const start = async () => {
    timeline.current = [];
    const res = await safeCall(() => startBossRecording(track, stage, title));
    if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
    setPhase({ name: "typing", lines: res.lines, token: res.token });
  };

  if (phase.name === "setup" || phase.name === "error") {
    return (
      <RetroWindow title="보스 만들기">
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-bold">보스 이름</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={30}
              placeholder={`예: 정보쌤의 ${TRACK_LABELS[track]} 도전장`}
              className="win-bevel-pressed h-10 bg-paper px-2 outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-4">
            <fieldset className="flex flex-col gap-1">
              <legend className="font-bold">트랙</legend>
              <div className="flex gap-1">
                {TRACKS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrack(t)}
                    className={`win-bevel h-10 px-3 ${track === t ? "win-bevel-pressed bg-paper font-bold" : ""}`}
                  >
                    {TRACK_LABELS[t]}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className="font-bold">글 난이도 (단계)</span>
              <select value={stage} onChange={(e) => setStage(Number(e.target.value))} className="win-bevel-pressed h-10 bg-paper px-2">
                {Array.from({ length: STAGE_COUNT }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {stageName(n)} · {getStage(track, n)?.level.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-small text-text-muted">
            이 단계의 글이 나와요. 선생님이 끝까지 친 시간과 진행 기록이 그대로 보스 고스트가 돼요. 학생들이 이길 수 있게 적당한 속도로 쳐 주세요!
          </p>
          {phase.name === "error" && <p className="text-red-500">{phase.message}</p>}
          <div>
            <PixelButton variant="success" onClick={start}>
              ▶ 기록 시작
            </PixelButton>
          </div>
        </div>
      </RetroWindow>
    );
  }

  if (phase.name === "typing") {
    return (
      <RetroWindow title={`보스 기록 중 - ${TRACK_LABELS[track]}`}>
        <TypingSession
          lines={phase.lines}
          track={track}
          onProgress={(done, ms) => {
            const last = timeline.current.at(-1);
            if (!last || last[1] !== done) timeline.current.push([ms, done]);
          }}
          onFinish={async (r) => {
            const sub = { ...toSubmission(phase.token, phase.lines, r), timeline: timeline.current };
            const res = await safeCall(() => saveBoss(sub));
            if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
            setPhase({ name: "done", cpm: res.cpm ?? 0, accuracy: res.accuracy ?? 0, durationMs: res.durationMs ?? 0 });
          }}
        />
      </RetroWindow>
    );
  }

  return (
    <RetroWindow title="보스 완성!">
      <p className="text-heading">
        👾 보스가 만들어졌어요: {phase.cpm}타 · 정확도 {phase.accuracy}% · {Math.round(phase.durationMs / 1000)}초
      </p>
      <p className="mt-2 text-small text-text-muted">학생 화면의 게임 → 보스전에 바로 나타나요.</p>
      <div className="mt-4 flex gap-2">
        <PixelLink href="/teacher/boss" variant="success" size="sm">
          보스 목록
        </PixelLink>
        <PixelButton size="sm" variant="ghost" onClick={() => setPhase({ name: "setup" })}>
          하나 더 만들기
        </PixelButton>
      </div>
    </RetroWindow>
  );
}
