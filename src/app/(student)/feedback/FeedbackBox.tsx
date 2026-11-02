"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitFeedback } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import type { FeedbackKind, MyFeedback } from "@/lib/feedback/server";

// 서버 모듈의 이름표를 화면에서 쓰려면 따로 둬야 해요 (server-only 라서)
const KIND_LABELS: Record<FeedbackKind, string> = { bug: "🐞 버그 제보", idea: "💡 아이디어" };
const STATUS_LABELS = { new: "보냈어요", seen: "선생님이 읽었어요", done: "반영했어요!" } as const;
const STATUS_CLASS = { new: "bg-paper", seen: "bg-sky-200", done: "bg-lime-400" } as const;

export function FeedbackBox({ items, ready, from }: { items: MyFeedback[]; ready: boolean; from: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const send = async () => {
    if (sending) return;
    setSending(true);
    const res = await safeCall(() => submitFeedback({ kind, body, page: from }));
    setSending(false);
    if ("error" in res) return setMessage(res.error);
    setBody("");
    setMessage(kind === "bug" ? "버그 제보를 보냈다! 타닥타닥 QA크루 고마워요!" : "아이디어를 보냈다! 선생님이 꼭 읽어 볼게요.");
    router.refresh();
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <RetroWindow title="건의함.exe">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col items-center gap-2 bg-navy-900 px-4 py-5 text-center">
            <MissionLabel keyword="NEW">버그를 찾았거나 좋은 생각이 있으면 알려 주세요!</MissionLabel>
            <p className="font-pixel text-small text-sky-100">보낸 글은 선생님만 읽어요. 친구들에게는 보이지 않아요.</p>
          </div>
          {!ready && <p className="bg-yellow-400 px-3 py-2 font-pixel text-body">건의함을 준비 중이에요. 선생님께 알려 주세요!</p>}
          <div className="flex gap-2" role="radiogroup" aria-label="종류">
            {(Object.keys(KIND_LABELS) as FeedbackKind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setKind(k)}
                className={`h-10 flex-1 px-3 font-pixel text-body text-navy-900 ${kind === k ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            rows={6}
            placeholder={
              kind === "bug"
                ? "어느 화면에서, 무엇을 했더니, 어떻게 됐는지 적어 주세요.\n예: 단어 비에서 다른 메뉴에 갔다 오니 하트가 안 줄어요."
                : "이런 기능이 있으면 좋겠어요!\n예: 프로필에 자기소개를 쓰고 싶어요."
            }
            className="win-bevel-pressed w-full resize-y bg-paper p-3 font-pixel text-body outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="font-pixel text-small text-text-muted">{body.trim().length} / 1000자 · 하루 10개까지</span>
            <PixelButton variant="success" disabled={sending || body.trim().length < 2 || !ready} onClick={send}>
              {sending ? "보내는 중..." : "보내기 ✉"}
            </PixelButton>
          </div>
          {message && <DialogBox key={message} text={message} />}
        </div>
      </RetroWindow>

      <RetroWindow title={`내가 보낸 글 (${items.length})`}>
        {items.length === 0 ? (
          <p className="font-pixel text-body text-text-muted">아직 보낸 글이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((f) => (
              <li key={f.id} className="win-bevel-pressed bg-paper px-3 py-2 font-pixel text-body">
                <div className="mb-1 flex items-center gap-2 text-small">
                  <span>{KIND_LABELS[f.kind]}</span>
                  <span className={`border-2 border-navy-900 px-2 ${STATUS_CLASS[f.status]}`}>{STATUS_LABELS[f.status]}</span>
                  <span className="ml-auto text-text-muted">{new Date(f.at).toLocaleDateString("ko-KR")}</span>
                </div>
                <p className="whitespace-pre-wrap break-words">{f.body}</p>
                {f.reply && (
                  <p className="mt-2 whitespace-pre-wrap border-l-4 border-lime-600 bg-lime-200 px-2 py-1">
                    <strong>선생님:</strong> {f.reply}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </RetroWindow>
    </div>
  );
}
