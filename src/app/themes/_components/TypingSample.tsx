// 시안 비교용 타자 영역 샘플. 글자 상태 색은 DESIGN.md 2장 "타자 영역 글자 색"을 따름.
// 세 시안 모두 같은 규칙을 쓰고, 바깥 틀만 테마에 맞게 바뀝니다.

type CharState = "done" | "error" | "current" | "pending";

function line(text: string, doneUntil: number, errorAt: number[]): { ch: string; state: CharState }[] {
  return [...text].map((ch, i) => {
    if (errorAt.includes(i)) return { ch, state: "error" };
    if (i < doneUntil) return { ch, state: "done" };
    if (i === doneUntil) return { ch, state: "current" };
    return { ch, state: "pending" };
  });
}

const STATE_CLASS: Record<CharState, string> = {
  done: "text-navy-900",
  error: "text-red-500 underline decoration-2 underline-offset-4",
  current: "bg-lime-200 text-navy-900 outline-2 outline-navy-900",
  pending: "text-[#8a97c0]",
};

export function TypingSample({ className = "" }: { className?: string }) {
  const korean = line("타닥타닥 우리 반이 함께 성장해요.", 11, [6]);
  const code = line('print("Hello, " + name)', 0, []);

  return (
    <div className={`bg-sky-50 px-6 py-5 font-typing ${className}`}>
      <p className="text-typing">
        {korean.map((c, i) => (
          <span key={i} className={STATE_CLASS[c.state]}>
            {c.ch}
          </span>
        ))}
      </p>
      <p className="mt-2 text-typing-code">
        <span className="mr-4 text-text-muted">2</span>
        {code.map((c, i) => (
          <span key={i} className={STATE_CLASS[c.state]}>
            {c.ch}
          </span>
        ))}
      </p>
    </div>
  );
}

export const SAMPLE_STATS = [
  { label: "타수", value: "182", diff: "▲ 12타" },
  { label: "정확도", value: "96%", diff: "▲ 3%p" },
  { label: "진행", value: "11/17", diff: "" },
] as const;
