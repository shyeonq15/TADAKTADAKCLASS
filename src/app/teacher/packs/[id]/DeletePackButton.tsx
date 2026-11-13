"use client";

import { deletePack } from "../actions";

/**
 * 교과 탐험 단원을 지우면 지문마다 모은 학생들의 별 기록도 함께 지워져요 (지문이 사라지니까).
 * 글을 고치려고 지우고 다시 올리면 학생 기록이 처음부터가 돼요 (2026-11-04 건의함 #25, #26). 그래서 한 번 더 크게 알려요
 */
export function DeletePackButton({ packId, explore }: { packId: string; explore?: boolean }) {
  const message = explore
    ? "이 교과 탐험 단원을 지울까요?\n\n⚠ 학생들이 이 단원에서 모은 별과 기록이 모두 함께 지워지고 되돌릴 수 없어요.\n글을 고쳐서 다시 올리려는 거라면, 학생 기록은 처음부터가 돼요."
    : "이 연습팩을 지울까요? 배포한 반에서도 사라져요.";
  return (
    <form
      action={deletePack}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="packId" value={packId} />
      <button className="win-bevel h-9 px-4 text-small text-red-500 active:win-bevel-pressed">이 연습팩 지우기</button>
    </form>
  );
}
