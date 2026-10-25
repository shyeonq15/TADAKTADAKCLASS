"use client";

import { useActionState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { addStudents, resetSecret } from "../../actions";

export function AddStudentsForm({ classId }: { classId: string }) {
  const [state, action, pending] = useActionState(addStudents, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="classId" value={classId} />
      <p className="text-small text-text-muted">
        한 줄에 &ldquo;번호 이름&rdquo;을 적어 주세요. 엑셀에서 번호·이름 두 칸을 복사해 붙여 넣어도 돼요.
      </p>
      <textarea
        name="roster"
        rows={6}
        placeholder={"1 김타닥\n2 이우리\n3 박코딩"}
        className="win-bevel-pressed w-full bg-paper p-2 font-typing text-body outline-none"
      />
      <div>
        <PixelButton size="sm" variant="success" type="submit" disabled={pending}>
          {pending ? "등록 중..." : "명단 등록"}
        </PixelButton>
      </div>
      {state && <p className={state.ok ? "text-lime-800" : "text-red-500"}>{state.message}</p>}
    </form>
  );
}

export function ResetSecretButton({ classId, studentId }: { classId: string; studentId: string }) {
  const [state, action, pending] = useActionState(resetSecret, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("이 학생의 그림 비밀번호를 지우고 다시 정하게 할까요?")) e.preventDefault();
      }}
      className="inline-flex items-center gap-2"
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      {state?.ok ? (
        <span className="text-small text-lime-800">{state.message}</span>
      ) : (
        <button type="submit" disabled={pending} className="win-bevel h-8 px-3 text-small active:win-bevel-pressed">
          비밀번호 초기화
        </button>
      )}
    </form>
  );
}
