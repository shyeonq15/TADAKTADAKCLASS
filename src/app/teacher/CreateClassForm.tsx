"use client";

import { useActionState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { createClass } from "./actions";

const inputClass = "win-bevel-pressed h-10 w-20 bg-paper px-2 text-body outline-none";

export function CreateClassForm() {
  const [state, action, pending] = useActionState(createClass, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <input name="grade" type="number" min={1} max={6} defaultValue={1} required className={inputClass} /> 학년
      </label>
      <label className="flex items-center gap-2">
        <input name="classNo" type="number" min={1} max={30} required className={inputClass} /> 반
      </label>
      <PixelButton size="sm" variant="success" type="submit" disabled={pending}>
        반 만들기
      </PixelButton>
      {state && <p className={state.ok ? "text-lime-800" : "text-red-500"}>{state.message}</p>}
    </form>
  );
}
