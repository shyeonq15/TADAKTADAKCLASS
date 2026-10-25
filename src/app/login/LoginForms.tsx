"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { PixelButton } from "@/components/ui/PixelButton";
import { pinLogin, signInWithGoogle, teacherLogin } from "./actions";

const ERRORS: Record<string, string> = {
  domain: "학교 계정(@senedu.kr)으로만 들어올 수 있어요. 다른 계정이면 PIN으로 로그인해 주세요.",
  link: "로그인 링크가 만료됐거나 다른 브라우저에서 열렸어요. 다시 시도해 주세요.",
  google: "구글 로그인을 시작하지 못했어요. 잠시 뒤 다시 해 주세요.",
  "google-off": "구글 로그인은 아직 준비 중이에요. 반 코드 + PIN으로 로그인해 주세요.",
};

type Tab = "google" | "pin" | "teacher";

const ALL_TABS: { id: Tab; label: string }[] = [
  { id: "pin", label: "학생 (반 코드 + PIN)" },
  { id: "google", label: "학교 구글 계정" },
  { id: "teacher", label: "선생님" },
];

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...input } = props;
  return (
    <label className="flex items-center gap-3 font-pixel text-body text-navy-900">
      <span className="w-20 shrink-0 font-bold">{label}</span>
      <input
        {...input}
        className="win-bevel-pressed h-10 min-w-0 flex-1 bg-paper px-2 font-typing text-body outline-none"
      />
    </label>
  );
}

function Message({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p role="status" className={`font-pixel text-small ${state.ok ? "text-lime-800" : "text-red-500"}`}>
      {state.message}
    </p>
  );
}

/** showGoogle: 구글 로그인을 켰을 때만 탭이 보임 (ENABLE_GOOGLE_LOGIN) */
export function LoginForms({ showGoogle }: { showGoogle: boolean }) {
  const error = useSearchParams().get("error");
  const TABS = ALL_TABS.filter((t) => showGoogle || t.id !== "google");
  const [tab, setTab] = useState<Tab>("pin");
  const [pinState, pinAction, pinPending] = useActionState(pinLogin, null);
  const [teacherState, teacherAction, teacherPending] = useActionState(teacherLogin, null);

  return (
    <div className="px-6 pb-6">
      <div role="tablist" className="flex gap-1 border-b-2 border-win-shadow pt-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-9 px-3 font-pixel text-small text-navy-900 ${tab === t.id ? "win-bevel bg-win-gray font-bold" : "win-bevel-pressed bg-[#c4c0b8]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pt-5">
        {error && ERRORS[error] && <p className="mb-4 bg-ink px-3 py-2 font-pixel text-small text-paper">{ERRORS[error]}</p>}

        {tab === "google" && (
          <form action={signInWithGoogle} className="flex flex-col items-center gap-3">
            <PixelButton variant="primary" type="submit" className="w-full">
              G 학교 구글 계정으로 로그인
            </PixelButton>
            <p className="font-pixel text-small text-text-muted">@senedu.kr 계정만 들어올 수 있어요.</p>
          </form>
        )}

        {tab === "pin" && (
          <form action={pinAction} className="flex flex-col gap-3">
            <Field label="반 코드" name="code" required maxLength={6} autoComplete="off" placeholder="예: K7M2QP" className="uppercase" />
            <Field label="번호" name="number" required type="number" min={1} max={50} inputMode="numeric" />
            <Field label="PIN" name="pin" required type="password" inputMode="numeric" maxLength={4} pattern="\d{4}" autoComplete="off" />
            <PixelButton variant="success" type="submit" disabled={pinPending}>
              {pinPending ? "확인 중..." : "로그인"}
            </PixelButton>
            <Message state={pinState} />
            <p className="font-pixel text-small text-text-muted">반 코드와 PIN은 선생님이 알려 줘요.</p>
          </form>
        )}

        {tab === "teacher" && (
          <form action={teacherAction} className="flex flex-col gap-3">
            <Field label="이메일" name="email" type="email" required autoComplete="username" />
            <Field label="비밀번호" name="password" type="password" required autoComplete="current-password" />
            <PixelButton variant="primary" type="submit" disabled={teacherPending}>
              {teacherPending ? "확인 중..." : "로그인"}
            </PixelButton>
            <Message state={teacherState} />
          </form>
        )}
      </div>
    </div>
  );
}
