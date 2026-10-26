"use client";

import { useActionState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { moveStudent, promoteClass } from "../../actions";

export type TargetClass = { id: string; label: string; year: number };

const selectClass = "win-bevel-pressed h-9 bg-paper px-2";

/** 반 전체 진급·이동 (번호 그대로) */
export function PromoteClassForm({ classId, year, targets }: { classId: string; year: number; targets: TargetClass[] }) {
  const [state, action, pending] = useActionState(promoteClass, null);
  if (!targets.length) return <p className="text-small text-text-muted">옮길 수 있는 반이 없어요. 먼저 새 반을 만들어 주세요.</p>;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("이 반 학생 전체를 고른 반으로 옮길까요? (번호는 그대로예요)")) e.preventDefault();
      }}
      className="flex flex-col gap-2"
    >
      <input type="hidden" name="classId" value={classId} />
      <div className="flex flex-wrap items-center gap-2">
        <span>이 반 학생 전체를</span>
        <select name="targetId" className={selectClass} required>
          {targets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
              {c.year > year ? " (진급)" : " (이동)"}
            </option>
          ))}
        </select>
        <span>(으)로</span>
        <PixelButton size="sm" variant="success" type="submit" disabled={pending}>
          {pending ? "옮기는 중..." : "옮기기"}
        </PixelButton>
      </div>
      <p className="text-small text-text-muted">
        새 학년도 반이면 <strong>진급</strong>이에요: 예전 반 기록은 그대로 남고, 학생은 새 학번으로 로그인해요. 같은 학년도 반이면 반을 바꿔요. 그림
        비밀번호·코인·티어·기록은 모두 학생에게 그대로 따라가요.
      </p>
      {state && <p className={state.ok ? "text-lime-800" : "text-red-500"}>{state.message}</p>}
    </form>
  );
}

/** 한 명 옮기기 (전학·반 배정 고치기) */
export function MoveStudentForm({
  classId,
  students,
  targets,
}: {
  classId: string;
  students: { id: string; label: string }[];
  targets: TargetClass[];
}) {
  const [state, action, pending] = useActionState(moveStudent, null);
  if (!students.length) return null;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="classId" value={classId} />
      <div className="flex flex-wrap items-center gap-2">
        <select name="studentId" className={selectClass} required>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span>학생을</span>
        <select name="targetId" className={selectClass} required>
          {targets.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <input name="number" type="number" min={1} max={50} required placeholder="번호" className={`${selectClass} w-20`} />
        <span>번으로</span>
        <PixelButton size="sm" variant="ghost" type="submit" disabled={pending}>
          {pending ? "옮기는 중..." : "한 명 옮기기"}
        </PixelButton>
      </div>
      {state && <p className={state.ok ? "text-lime-800" : "text-red-500"}>{state.message}</p>}
    </form>
  );
}
