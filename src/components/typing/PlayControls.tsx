"use client";

import { useState, type MouseEvent } from "react";
import { PixelButton } from "@/components/ui/PixelButton";

type Props = {
  /** 이 판을 처음부터 다시 */
  onRestart: () => void;
  /** 이 판을 그만두고 나가기 */
  onQuit: () => void;
  /** 그만하기 전에 한 번 더 묻는 글 (없으면 바로 그만해요) */
  quitConfirm?: string;
  /** 다시 하기 전에 한 번 더 묻는 글 (없으면 바로 다시 해요) */
  restartConfirm?: string;
};

/**
 * 연습·게임 중간에 쓰는 "다시 하기 / 그만하기" 버튼 (건의함 #11, #41).
 * 버튼을 눌러도 타자 칸의 포커스가 빠지지 않게 해서, "계속하기"를 누르면 바로 이어 칠 수 있어요.
 */
export function PlayControls({ onRestart, onQuit, quitConfirm, restartConfirm }: Props) {
  const [asking, setAsking] = useState<"quit" | "restart" | null>(null);
  // 마우스로 눌러도 타자 칸에서 포커스를 가져오지 않게
  const keepFocus = (e: MouseEvent) => e.preventDefault();

  if (asking) {
    const text = asking === "quit" ? quitConfirm : restartConfirm;
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 font-pixel text-small text-navy-900" role="alert">
        <span className="bg-yellow-400 px-2 py-1 font-bold">{text}</span>
        <PixelButton
          size="sm"
          variant={asking === "quit" ? "primary" : "success"}
          onMouseDown={keepFocus}
          onClick={() => {
            setAsking(null);
            if (asking === "quit") onQuit();
            else onRestart();
          }}
        >
          {asking === "quit" ? "네, 그만할래요" : "네, 다시 할래요"}
        </PixelButton>
        <PixelButton size="sm" variant="ghost" onMouseDown={keepFocus} onClick={() => setAsking(null)}>
          계속하기
        </PixelButton>
      </div>
    );
  }

  return (
    <div className="flex justify-end gap-2">
      <PixelButton
        size="sm"
        variant="ghost"
        onMouseDown={keepFocus}
        onClick={() => (restartConfirm ? setAsking("restart") : onRestart())}
      >
        ↻ 다시 하기
      </PixelButton>
      <PixelButton size="sm" variant="ghost" onMouseDown={keepFocus} onClick={() => (quitConfirm ? setAsking("quit") : onQuit())}>
        ■ 그만하기
      </PixelButton>
    </div>
  );
}
