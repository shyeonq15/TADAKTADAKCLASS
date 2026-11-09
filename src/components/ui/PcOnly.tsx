"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { deviceKind, isTypingPath, PC_ONLY_MESSAGE, type DeviceKind } from "@/lib/device";
import { PixelLink } from "./PixelButton";
import { RetroWindow } from "./RetroWindow";

const subscribe = () => () => {};
const KEYBOARD_OK = "tadak-keyboard-ok";

/** 휴대폰에서 타자 화면 대신 보여 주는 안내 */
function PhoneNotice() {
  return (
    <main className="mx-auto flex w-full max-w-md px-4 py-8">
      <RetroWindow title="💻 컴퓨터에서_만나요.txt" className="w-full">
        <div className="flex flex-col items-center gap-3 bg-cream px-4 py-6 text-center font-pixel text-body text-navy-900">
          <p className="text-heading">⌨️</p>
          <p className="font-bold">{PC_ONLY_MESSAGE}</p>
          <p className="text-small text-text-muted">휴대폰으로는 영단어 연구소와 교과 탐험 퀴즈를 할 수 있어요.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <PixelLink href="/vocab" variant="success" size="sm">
              영단어 연구소
            </PixelLink>
            <PixelLink href="/explore" variant="primary" size="sm">
              교과 탐험
            </PixelLink>
            <PixelLink href="/" variant="ghost" size="sm">
              홈으로
            </PixelLink>
          </div>
        </div>
      </RetroWindow>
    </main>
  );
}

/**
 * 태블릿: 키보드의 F·J 키를 눌러야 들어가요. 입력 칸이 없어서 화면 키보드는 뜨지 않으니,
 * 연결한 진짜 키보드로만 통과할 수 있어요. 한 번 통과하면 브라우저를 닫을 때까지 기억해요
 */
function KeyboardCheck({ onPass }: { onPass: () => void }) {
  const [pressed, setPressed] = useState<Set<string>>(new Set());
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" && e.code !== "KeyJ") return;
      setPressed((p) => new Set(p).add(e.code));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (pressed.size < 2) return;
    try {
      sessionStorage.setItem(KEYBOARD_OK, "1");
    } catch {}
    onPass();
  }, [pressed, onPass]);

  return (
    <main className="mx-auto flex w-full max-w-md px-4 py-8">
      <RetroWindow title="⌨️ 키보드_확인.exe" className="w-full">
        <div className="flex flex-col items-center gap-3 bg-cream px-4 py-6 text-center font-pixel text-body text-navy-900">
          <p className="font-bold">태블릿이네요! 키보드를 연결했는지 확인할게요.</p>
          <p>
            키보드에서 <strong>F</strong> 키와 <strong>J</strong> 키를 눌러 주세요.
          </p>
          <div className="flex gap-3 font-title text-title">
            {["KeyF", "KeyJ"].map((c) => (
              <span
                key={c}
                className={`win-bevel flex size-14 items-center justify-center ${pressed.has(c) ? "bg-lime-400" : "bg-paper"}`}
              >
                {c.slice(3)}
              </span>
            ))}
          </div>
          <p className="text-small text-text-muted">키보드가 없으면 영단어 연구소와 교과 탐험 퀴즈를 할 수 있어요.</p>
          <PixelLink href="/" variant="ghost" size="sm">
            홈으로
          </PixelLink>
        </div>
      </RetroWindow>
    </main>
  );
}

/** 학생 화면에서: 타자 화면이면 휴대폰은 막고, 태블릿은 키보드를 확인해요. 선생님은 막지 않아요 */
export function PcOnlyGuard({ isTeacher, children }: { isTeacher: boolean; children: ReactNode }) {
  const path = usePathname();
  const kind = useSyncExternalStore<DeviceKind>(subscribe, deviceKind, () => "pc");
  const remembered = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return sessionStorage.getItem(KEYBOARD_OK) === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const [passed, setPassed] = useState(false);

  if (isTeacher || kind === "pc" || !isTypingPath(path)) return children;
  if (kind === "phone") return <PhoneNotice />;
  if (remembered || passed) return children;
  return <KeyboardCheck onPass={() => setPassed(true)} />;
}
