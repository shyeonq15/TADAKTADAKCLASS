"use client";

import { useActionState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { addPinStudents, resetPin, type ActionState } from "../../actions";

function PinTable({ state }: { state: ActionState }) {
  if (!state?.pins?.length) return null;
  return (
    <table className="mt-3 w-full border-3 border-navy-900 bg-paper text-body">
      <thead>
        <tr className="border-b-2 border-navy-900 text-left">
          <th className="px-3 py-1">번호</th>
          <th className="px-3 py-1">이름</th>
          <th className="px-3 py-1">PIN</th>
        </tr>
      </thead>
      <tbody>
        {state.pins.map((p) => (
          <tr key={p.number} className="border-b border-win-shadow">
            <td className="px-3 py-1">{p.number}</td>
            <td className="px-3 py-1">{p.name}</td>
            <td className="px-3 py-1 font-typing text-heading tracking-widest">{p.pin}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AddStudentsForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(addPinStudents, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="classId" value={classId} />
      <p className="text-small text-text-muted">
        학교 구글 로그인이 안 될 때 쓰는 방법이에요. 한 줄에 &ldquo;번호 이름&rdquo;을 적어 주세요. 엑셀에서 두 칸을 복사해 붙여 넣어도 돼요.
      </p>
      <textarea
        name="roster"
        rows={6}
        placeholder={"1 김타닥\n2 이우리\n3 박코딩"}
        className="win-bevel-pressed w-full bg-paper p-2 font-typing text-body outline-none"
      />
      <div>
        <PixelButton size="sm" variant="success" type="submit" disabled={pending}>
          {pending ? "등록 중..." : "등록하고 PIN 만들기"}
        </PixelButton>
      </div>
      {state && <p className={state.ok ? "text-lime-800" : "text-red-500"}>{state.message}</p>}
      <PinTable state={state} />
    </form>
  );
}

export function ResetPinButton({ classId, studentId }: { classId: string; studentId: string }) {
  const [state, action, pending] = useActionState(resetPin, null);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      {state?.pins?.[0] ? (
        <span className="font-typing text-heading tracking-widest">{state.pins[0].pin}</span>
      ) : (
        <button type="submit" disabled={pending} className="win-bevel h-8 px-3 text-small active:win-bevel-pressed">
          PIN 다시 만들기
        </button>
      )}
    </form>
  );
}
