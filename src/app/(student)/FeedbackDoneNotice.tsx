"use client";

import { useEffect, useRef, useState } from "react";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";

export type DoneFeedback = { id: string; body: string; reply: string | null };

const seenKey = (id: string) => `tadak-feedback-done-seen:${id}`;

/**
 * 건의함 글이 "반영했어요!"가 되면 홈에서 한 번 알려 줘요 (닫으면 이 기기에서는 다시 안 떠요).
 * 브라우저 저장소를 읽으므로 ClientOnly 안에서 그려요.
 */
export function FeedbackDoneNotice({ items }: { items: DoneFeedback[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [fresh] = useState<DoneFeedback[]>(() =>
    items.filter((f) => {
      try {
        return localStorage.getItem(seenKey(f.id)) !== "1";
      } catch {
        return false; // 저장소를 못 쓰면 매번 뜨지 않게 그냥 넘어가요
      }
    }),
  );

  useEffect(() => {
    if (fresh.length && !ref.current?.open) ref.current?.showModal();
  }, [fresh]);

  const close = () => {
    try {
      fresh.forEach((f) => localStorage.setItem(seenKey(f.id), "1"));
    } catch {}
    ref.current?.close();
  };

  if (!fresh.length) return null;
  return (
    <dialog
      ref={ref}
      onCancel={close}
      className="m-auto w-[min(560px,92vw)] bg-transparent p-0 backdrop:bg-navy-900/50"
    >
      <RetroWindow title="📬 건의함_답장.txt" onClose={close}>
        <div className="flex max-h-[75vh] flex-col gap-3 overflow-y-auto font-pixel text-body leading-7 text-navy-900">
          <p className="title-lime text-center text-title">📬 건의에 답장이 왔어요!</p>
          <p className="border-3 border-pink-400 bg-cream px-3 py-2 text-center">
            우리반을 더 좋게 만들려고 의견을 보내 줘서 고마워요!
            <br />
            칭호 <strong>🐞 QA크루</strong>를 얻었다!
          </p>
          <ul className="flex flex-col gap-2">
            {fresh.map((f) => (
              <li key={f.id} className="win-bevel-pressed bg-paper px-3 py-2 text-small">
                <p className="line-clamp-3 text-text-muted">“{f.body}”</p>
                {f.reply && <p className="mt-1 font-bold">↳ 선생님: {f.reply}</p>}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-center gap-2">
            <PixelLink href="/profile" variant="success" size="sm" onClick={close}>
              칭호 보러 가기 ▶
            </PixelLink>
            <PixelLink href="/feedback" variant="ghost" size="sm" onClick={close}>
              내 건의 보기
            </PixelLink>
          </div>
        </div>
      </RetroWindow>
    </dialog>
  );
}
