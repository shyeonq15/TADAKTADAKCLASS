"use client";

import { useActionState } from "react";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton } from "@/components/ui/PixelButton";
import { saveOnboarding } from "./actions";

const inputClass = "win-bevel-pressed h-10 w-full bg-paper px-2 font-typing text-body outline-none";

export function OnboardingForm({ needsClass, currentNickname }: { needsClass: boolean; currentNickname: string }) {
  const [state, action, pending] = useActionState(saveOnboarding, null);

  return (
    <form action={action} className="flex flex-col gap-4 font-pixel text-body text-navy-900">
      <MissionLabel keyword="NEW">타닥타닥 우리반에 온 걸 환영해요!</MissionLabel>

      {needsClass && (
        <>
          <label className="flex flex-col gap-1">
            <span className="font-bold">반 코드</span>
            <input name="code" required maxLength={6} autoComplete="off" className={`${inputClass} uppercase`} placeholder="선생님이 알려 준 6글자" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">내 번호</span>
            <input name="number" required type="number" min={1} max={50} inputMode="numeric" className={inputClass} />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1">
        <span className="font-bold">닉네임</span>
        <input name="nickname" required minLength={2} maxLength={12} defaultValue={currentNickname} autoComplete="off" className={inputClass} />
        <span className="text-small text-text-muted">친구들에게는 닉네임만 보여요. 실명은 쓰지 말아 주세요. (2~12글자)</span>
      </label>

      {state && <p role="status" className="text-small text-red-500">{state.message}</p>}

      <PixelButton variant="success" type="submit" disabled={pending}>
        {pending ? "저장 중..." : "▶ 시작하기"}
      </PixelButton>
    </form>
  );
}
