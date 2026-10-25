"use client";

import { useActionState, useState } from "react";
import { TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { PixelButton } from "@/components/ui/PixelButton";
import { MAX_ROUNDS, splitPassage } from "@/lib/passages/split";
import { createPack } from "../actions";

const HINT: Record<Track, string> = {
  korean: "문장 단위로 나누고, 긴 문장은 띄어쓰기에서 줄을 나눠요. 4줄이 한 판이에요.",
  english: "문장 단위로 나누고, 긴 문장은 띄어쓰기에서 줄을 나눠요. 4줄이 한 판이에요.",
  symbol: "기호가 많은 글이나 식을 붙여 넣으세요. 4줄이 한 판이에요.",
  code: "줄바꿈과 들여쓰기를 그대로 지켜요. 빈 줄을 기준으로 끊어서 12줄 안쪽이 한 판이에요.",
};

export function NewPackForm() {
  const [state, action, pending] = useActionState(createPack, null);
  const [track, setTrack] = useState<Track>("korean");
  const [text, setText] = useState("");
  const preview = splitPassage(text, track);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-bold">이름</span>
          <input name="title" required maxLength={40} placeholder="예: 정보 1단원 - 컴퓨팅 사고력" className="win-bevel-pressed h-10 bg-paper px-2 outline-none" />
        </label>
        <fieldset className="flex flex-col gap-1">
          <legend className="font-bold">트랙</legend>
          <div className="flex gap-1">
            {TRACKS.map((t) => (
              <label key={t} className={`win-bevel flex h-10 cursor-pointer items-center px-3 ${track === t ? "win-bevel-pressed bg-paper font-bold" : ""}`}>
                <input type="radio" name="track" value={t} checked={track === t} onChange={() => setTrack(t)} className="sr-only" />
                {TRACK_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-bold">글 붙여 넣기</span>
        <span className="text-small text-text-muted">{HINT[track]} 둥근 따옴표·말줄임표 같은 문자는 키보드로 칠 수 있게 바꿔요.</span>
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={track === "code" ? 'for i in range(3):\n    print("hi")' : "교과서나 수업 자료에서 고른 글을 붙여 넣으세요."}
          className="win-bevel-pressed w-full bg-paper p-2 font-typing text-body outline-none"
        />
      </label>

      <div>
        <p className="font-bold">
          미리보기: {preview.rounds.length}판
          {preview.rounds.length >= MAX_ROUNDS && <span className="text-red-500"> (최대 {MAX_ROUNDS}판까지만 저장돼요)</span>}
        </p>
        <div className="mt-2 grid max-h-80 gap-2 overflow-y-auto md:grid-cols-2">
          {preview.rounds.map((lines, i) => (
            <div key={i} className="border-3 border-navy-900 bg-surface px-3 py-2">
              <p className="text-small text-text-muted">{i + 1}판</p>
              <pre className="whitespace-pre-wrap font-typing text-small">{lines.join("\n")}</pre>
            </div>
          ))}
        </div>
      </div>

      <p className="text-small text-text-muted">
        교과서 PDF 원본은 저장하지 않아요. 선생님이 고른 발췌문만 저장되고, 우리 학교 선생님들만 볼 수 있어요.
      </p>
      <div className="flex items-center gap-3">
        <PixelButton variant="success" type="submit" disabled={pending || preview.rounds.length === 0}>
          {pending ? "저장 중..." : "연습팩 저장"}
        </PixelButton>
        {state && !state.ok && <p className="text-red-500">{state.message}</p>}
      </div>
    </form>
  );
}
