"use client";

import { useState } from "react";
import { ClientOnly } from "@/components/ui/ClientOnly";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { FeedbackDoneNotice, type DoneFeedback } from "../../(student)/FeedbackDoneNotice";

// 예시 글 (실제 학생 글이 아니에요)
const ONE: DoneFeedback[] = [
  {
    id: "one",
    body: "토끼 달리기에서 하트가 다 없어져도 게임이 안 끝나요.",
    reply: "알려 줘서 고마워요! 이제 하트가 0이 되면 바로 끝나요 🛠️",
  },
];
const MANY: DoneFeedback[] = [
  ...ONE,
  {
    id: "two",
    body: "연습하다가 처음부터 다시 하고 싶을 때 누를 버튼이 있으면 좋겠어요.",
    reply: "좋은 생각이에요! 연습·게임 중에 '다시 하기 / 그만하기' 버튼을 만들었어요.",
  },
  { id: "three", body: "디벗으로 영어 칠 때 한/영 키 바꾸라고 계속 떠요.", reply: null },
];

export function FeedbackNoticePreview() {
  const [items, setItems] = useState<DoneFeedback[] | null>(null);
  const [grantedTo, setGrantedTo] = useState<string | null>(null);
  const [n, setN] = useState(0);
  // 볼 때마다 새 id: 한 번 닫으면 다시 안 뜨는 기능 때문에
  const show = (list: DoneFeedback[], gift = false) => {
    setN((x) => x + 1);
    setGrantedTo(gift ? `preview-${Date.now()}` : null);
    setItems(list.map((f) => ({ ...f, id: `preview-${Date.now()}-${f.id}` })));
  };

  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <RetroWindow title="미리보기_건의반영알림.exe">
          <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
            <p>
              건의에 답장이 오거나 선생님이 QA크루를 직접 준 학생이 <strong>홈에 들어오면</strong> 한 번 뜨는 창이에요. 닫으면 그
              컴퓨터에서는 다시 뜨지 않아요.
            </p>
            <div className="flex flex-wrap gap-2">
              <PixelButton variant="success" onClick={() => show(ONE)}>
                건의 1개 반영
              </PixelButton>
              <PixelButton onClick={() => show(MANY)}>건의 3개 반영 (답장 없는 것 포함)</PixelButton>
              <PixelButton variant="ghost" onClick={() => show([], true)}>
                선생님이 칭호 선물
              </PixelButton>
            </div>
            <p className="text-small text-text-muted">예시 글이에요. 실제로는 학생이 쓴 글과 선생님 답장이 나와요.</p>
          </div>
        </RetroWindow>
        {items && (
          <ClientOnly key={n}>
            <FeedbackDoneNotice items={items} grantedTo={grantedTo} />
          </ClientOnly>
        )}
      </main>
    </DesktopBackground>
  );
}
