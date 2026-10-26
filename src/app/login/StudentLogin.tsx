"use client";

import { useActionState, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { encodeSecret, PICTURES, SECRET_LENGTH } from "@/lib/auth/pictures";
import { lookupStudent, pictureLogin, setupPicture } from "./actions";

/** 그림 12개 키패드 + 고른 칸 표시 */
function PicturePad({ picks, onChange, disabled }: { picks: number[]; onChange: (p: number[]) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center gap-2" aria-label={`${picks.length}개 골랐어요`}>
        {Array.from({ length: SECRET_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`flex size-14 items-center justify-center border-3 border-navy-900 text-[32px] ${
              i < picks.length ? "bg-lime-200" : i === picks.length ? "bg-paper outline-2 outline-dashed outline-navy-700" : "bg-paper"
            }`}
          >
            {i < picks.length ? "●" : ""}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {PICTURES.map((p, i) => (
          <button
            key={p.name}
            type="button"
            disabled={disabled || picks.length >= SECRET_LENGTH}
            onClick={() => onChange([...picks, i])}
            aria-label={p.name}
            className="win-bevel flex h-16 flex-col items-center justify-center active:win-bevel-pressed disabled:opacity-60"
          >
            <span className="text-[28px] leading-none">{p.emoji}</span>
            <span className="font-pixel text-small text-navy-900">{p.name}</span>
          </button>
        ))}
      </div>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => onChange(picks.slice(0, -1))}
          disabled={disabled || picks.length === 0}
          className="win-bevel h-9 px-4 font-pixel text-small active:win-bevel-pressed disabled:opacity-50"
        >
          ← 하나 지우기
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={disabled || picks.length === 0}
          className="win-bevel h-9 px-4 font-pixel text-small active:win-bevel-pressed disabled:opacity-50"
        >
          처음부터
        </button>
      </div>
    </div>
  );
}

function Status({ text, ok = false }: { text?: string; ok?: boolean }) {
  if (!text) return null;
  return (
    <p role="status" className={`font-pixel text-small ${ok ? "text-lime-800" : "text-red-500"}`}>
      {text}
    </p>
  );
}

/** 로그인: 그림 4개 고르면 바로 확인 */
function LoginStep({ studentNo, label, onBack }: { studentNo: string; label: string; onBack: () => void }) {
  const [picks, setPicks] = useState<number[]>([]);
  const [state, action, pending] = useActionState(pictureLogin, null);
  const [shownError, setShownError] = useState<string | undefined>();
  // 비밀번호가 틀렸다는 답이 오면 고른 그림을 바로 비워서 처음부터 다시 누르게 해요
  const [answered, setAnswered] = useState(state);
  if (state !== answered) {
    setAnswered(state);
    if (state?.message) setPicks([]);
  }

  const choose = (next: number[]) => {
    setShownError(undefined);
    setPicks(next);
  };

  return (
    <form action={action} className="flex flex-col gap-3" onSubmit={() => setShownError(undefined)}>
      <input type="hidden" name="studentNo" value={studentNo} />
      <input type="hidden" name="secret" value={encodeSecret(picks)} />
      <p className="text-center font-pixel text-body">
        <strong>{label}</strong> · 내 그림 비밀번호 4개를 순서대로 눌러 주세요
      </p>
      <PicturePad picks={picks} onChange={choose} disabled={pending} />
      <PixelButton variant="success" type="submit" disabled={pending || picks.length < SECRET_LENGTH} autoFocus>
        {pending ? "확인 중..." : "로그인"}
      </PixelButton>
      <Status text={shownError ?? state?.message} />
      <button type="button" onClick={onBack} className="font-pixel text-small text-text-muted underline underline-offset-4">
        학번 다시 쓰기
      </button>
    </form>
  );
}

/** 처음: 그림 4개 고르기 → 한 번 더 → 저장 */
function SetupStep({ studentNo, label, onBack }: { studentNo: string; label: string; onBack: () => void }) {
  const [first, setFirst] = useState<number[] | null>(null);
  const [picks, setPicks] = useState<number[]>([]);
  const [mismatch, setMismatch] = useState(false);
  const [state, action, pending] = useActionState(setupPicture, null);
  const confirming = first !== null;
  const matches = confirming && encodeSecret(first) === encodeSecret(picks);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="studentNo" value={studentNo} />
      <input type="hidden" name="secret" value={first ? encodeSecret(first) : ""} />
      <p className="text-center font-pixel text-body">
        <strong>{label}</strong> · 처음 왔네요!
        <br />
        {confirming ? "확인을 위해 같은 그림 4개를 한 번 더 눌러 주세요" : "나만 아는 그림 4개를 순서대로 골라 비밀번호로 정해요"}
      </p>
      <PicturePad
        picks={picks}
        onChange={(p) => {
          setMismatch(false);
          setPicks(p);
        }}
        disabled={pending}
      />
      {!confirming ? (
        <PixelButton
          variant="primary"
          type="button"
          disabled={picks.length < SECRET_LENGTH}
          onClick={() => {
            setFirst(picks);
            setPicks([]);
          }}
        >
          다음 ▶
        </PixelButton>
      ) : matches ? (
        <PixelButton variant="success" type="submit" disabled={pending} autoFocus>
          {pending ? "저장 중..." : "이 비밀번호로 정하기"}
        </PixelButton>
      ) : (
        <PixelButton
          variant="primary"
          type="button"
          disabled={picks.length < SECRET_LENGTH}
          onClick={() => {
            setMismatch(true);
            setFirst(null);
            setPicks([]);
          }}
        >
          확인
        </PixelButton>
      )}
      {mismatch && <Status text="두 번 고른 그림이 달라요. 처음부터 다시 골라 주세요." />}
      <Status text={state?.message} />
      <p className="font-pixel text-small text-text-muted">친구에게 알려 주지 마세요. 잊어버리면 선생님이 다시 정하게 해 줄 수 있어요.</p>
      <button type="button" onClick={onBack} className="font-pixel text-small text-text-muted underline underline-offset-4">
        학번 다시 쓰기
      </button>
    </form>
  );
}

/** 학생 로그인: 학번 → 그림 비밀번호 */
export function StudentLogin() {
  const [state, action, pending] = useActionState(lookupStudent, null);
  // "학번 다시 쓰기"를 누른 결과는 숨김 (새로 확인하면 새 결과가 나옴)
  const [dismissed, setDismissed] = useState<typeof state>(null);
  const current = state !== dismissed ? state : null;
  const found = current && current.step !== "notfound" ? current : null;

  if (found) {
    const back = () => setDismissed(state);
    if (found.step === "login") return <LoginStep key={found.studentNo} studentNo={found.studentNo} label={found.label} onBack={back} />;
    if (found.step === "setup") return <SetupStep key={found.studentNo} studentNo={found.studentNo} label={found.label} onBack={back} />;
    return (
      <div className="flex flex-col gap-3 text-center font-pixel text-body">
        <p>
          <strong>{found.label}</strong>
        </p>
        <p>아직 그림 비밀번호를 정하지 않았어요. 선생님께 &ldquo;비밀번호 정하기&rdquo;를 켜 달라고 말씀해 주세요.</p>
        <PixelButton variant="ghost" type="button" onClick={back}>
          돌아가기
        </PixelButton>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 font-pixel text-body text-navy-900">
        <span className="font-bold">내 학번</span>
        <input
          name="studentNo"
          required
          inputMode="numeric"
          autoComplete="off"
          maxLength={5}
          pattern="\d{4,5}"
          autoFocus
          placeholder="예: 10307"
          className="win-bevel-pressed h-14 w-full bg-paper px-3 text-center font-typing text-[32px] tracking-[0.3em] outline-none"
        />
        <span className="text-small text-text-muted">1학년 3반 7번이면 10307</span>
      </label>
      <PixelButton variant="success" type="submit" disabled={pending}>
        {pending ? "찾는 중..." : "다음 ▶"}
      </PixelButton>
      {current?.step === "notfound" && <Status text={current.message} />}
    </form>
  );
}
