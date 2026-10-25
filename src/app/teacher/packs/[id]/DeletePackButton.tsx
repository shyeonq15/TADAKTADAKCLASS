"use client";

import { deletePack } from "../actions";

export function DeletePackButton({ packId }: { packId: string }) {
  return (
    <form
      action={deletePack}
      onSubmit={(e) => {
        if (!window.confirm("이 연습팩을 지울까요? 배포한 반에서도 사라져요.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="packId" value={packId} />
      <button className="win-bevel h-9 px-4 text-small text-red-500 active:win-bevel-pressed">이 연습팩 지우기</button>
    </form>
  );
}
