"use client";

import { useActionState, useState } from "react";
import { encodeSecret, PICTURES, SECRET_LENGTH, weakSecretReason } from "@/lib/auth/pictures";
import { setStudentSecret, unlockStudent } from "../../actions";

/** 선생님이 그림 비밀번호를 직접 정해 주기 (버튼을 누르면 그림 12개가 펼쳐져요) */
export function SetSecretButton({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<number[]>([]);
  const [state, action, pending] = useActionState(setStudentSecret, null);
  const secret = encodeSecret(picks);
  const weak = picks.length === SECRET_LENGTH ? weakSecretReason(secret) : null;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="win-bevel h-8 px-3 text-small active:win-bevel-pressed">
        비밀번호 바꾸기
      </button>
    );
  }

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`${name} 학생의 그림 비밀번호를 바꿀까요? 로그인돼 있던 PC는 로그아웃돼요.`)) e.preventDefault();
      }}
      className="mt-1 flex w-64 flex-col gap-2 border-2 border-navy-900 bg-paper p-2 text-left"
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="secret" value={secret} />
      <p className="text-small">
        새 그림 4개 (순서대로):{" "}
        <strong className="text-heading">{picks.map((i) => PICTURES[i].emoji).join(" ") || "-"}</strong>
      </p>
      <div className="grid grid-cols-6 gap-1">
        {PICTURES.map((p, i) => (
          <button
            key={p.name}
            type="button"
            title={p.name}
            disabled={picks.length >= SECRET_LENGTH}
            onClick={() => setPicks([...picks, i])}
            className="win-bevel h-9 text-[20px] active:win-bevel-pressed disabled:opacity-50"
          >
            {p.emoji}
          </button>
        ))}
      </div>
      {weak && <p className="text-small text-red-500">{weak}</p>}
      {state?.message && <p className={`text-small ${state.ok ? "text-lime-800" : "text-red-500"}`}>{state.message}</p>}
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={pending || picks.length < SECRET_LENGTH || !!weak}
          className="win-bevel h-8 flex-1 bg-lime-400 px-2 text-small font-bold active:win-bevel-pressed disabled:opacity-50"
        >
          {pending ? "저장 중..." : "이 그림으로 바꾸기"}
        </button>
        <button type="button" onClick={() => setPicks([])} className="win-bevel h-8 px-2 text-small active:win-bevel-pressed">
          지우기
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPicks([]);
          }}
          className="win-bevel h-8 px-2 text-small active:win-bevel-pressed"
        >
          닫기
        </button>
      </div>
    </form>
  );
}

/** 잠금 풀기 */
export function UnlockButton({ classId, studentId }: { classId: string; studentId: string }) {
  return (
    <form action={unlockStudent} className="inline">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <button className="win-bevel h-8 bg-yellow-400 px-3 text-small font-bold active:win-bevel-pressed">🔓 잠금 풀기</button>
    </form>
  );
}
