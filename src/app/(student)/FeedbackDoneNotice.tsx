"use client";

import { useEffect, useRef, useState } from "react";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";

export type DoneFeedback = { id: string; body: string; reply: string | null };

const seenKey = (id: string) => `tadak-feedback-done-seen:${id}`;
/** 선생님이 직접 준 QA크루 알림 (학생마다 한 번) */
const grantKey = (userId: string) => `tadak-qa-grant-seen:${userId}`;

const unseen = (key: string) => {
  try {
    return localStorage.getItem(key) !== "1";
  } catch {
    return false; // 저장소를 못 쓰면 매번 뜨지 않게 그냥 넘어가요
  }
};

/**
 * 건의함 글에 답장이 오거나(반영했어요!), 선생님이 QA크루 칭호를 직접 주면 홈에서 한 번 알려 줘요.
 * 닫으면 이 기기에서는 다시 안 떠요. 브라우저 저장소를 읽으므로 ClientOnly 안에서 그려요.
 */
export function FeedbackDoneNotice({
  items,
  grantedTo,
}: {
  items: DoneFeedback[];
  /** 선생님이 직접 QA크루를 준 학생이면 그 학생 id */
  grantedTo?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [fresh] = useState<DoneFeedback[]>(() => items.filter((f) => unseen(seenKey(f.id))));
  const [grant] = useState(() => !!grantedTo && unseen(grantKey(grantedTo)));
  const open = fresh.length > 0 || grant;

  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
  }, [open]);

  const close = () => {
    try {
      fresh.forEach((f) => localStorage.setItem(seenKey(f.id), "1"));
      if (grant && grantedTo) localStorage.setItem(grantKey(grantedTo), "1");
    } catch {}
    ref.current?.close();
  };

  if (!open) return null;
  // 직접 받은 칭호만 있을 때는 "선물" 창, 답장이 있으면 답장 창
  const giftOnly = !fresh.length;
  return (
    <dialog
      ref={ref}
      onCancel={close}
      className="m-auto w-[min(560px,92vw)] bg-transparent p-0 backdrop:bg-navy-900/50"
    >
      <RetroWindow title={giftOnly ? "🎁 칭호_선물.txt" : "📬 건의함_답장.txt"} onClose={close}>
        <div className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto font-pixel text-body leading-7 text-navy-900">
          <p className="title-lime text-center text-title">
            {giftOnly ? "🎁 선생님이 칭호를 줬어요!" : "📬 건의에 답장이 왔어요!"}
          </p>
          <p className="border-3 border-pink-400 bg-cream px-3 py-2 text-center">
            {giftOnly
              ? "타닥타닥 우리반을 함께 써 보고 더 좋게 만들어 줘서 고마워요!"
              : "우리반을 더 좋게 만들려고 의견을 보내 줘서 고마워요!"}
            <br />
            칭호 <strong>🐞 QA크루</strong>를 얻었다!
          </p>
          {fresh.length > 0 && (
            <ul className="flex flex-col gap-2">
              {fresh.map((f) => (
                <li key={f.id} className="win-bevel-pressed bg-paper px-3 py-2 text-small">
                  <p className="line-clamp-3 text-text-muted">“{f.body}”</p>
                  {f.reply && <p className="mt-1 font-bold">↳ 선생님: {f.reply}</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            <PixelLink href="/profile" variant="success" size="sm" onClick={close}>
              칭호 보러 가기 ▶
            </PixelLink>
            {fresh.length > 0 && (
              <PixelLink href="/feedback" variant="ghost" size="sm" onClick={close}>
                내 건의 보기
              </PixelLink>
            )}
          </div>
        </div>
      </RetroWindow>
    </dialog>
  );
}
