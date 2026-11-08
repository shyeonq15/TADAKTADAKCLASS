"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { isMobileDevice, PC_ONLY_MESSAGE } from "@/lib/device";
import { RetroWindow } from "./RetroWindow";

const subscribe = () => () => {};

/** 휴대폰·태블릿에서 학생 화면 대신 보여 주는 안내 */
export function PcOnlyNotice() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <RetroWindow title="💻 컴퓨터에서_만나요.txt" className="w-full">
        <div className="flex flex-col items-center gap-3 bg-cream px-4 py-6 text-center font-pixel text-body text-navy-900">
          <p className="title-lime text-title">타닥타닥 우리반</p>
          <p className="text-heading">⌨️</p>
          <p className="font-bold">{PC_ONLY_MESSAGE}</p>
          <p className="text-small text-text-muted">
            타닥타닥 우리반은 진짜 키보드로 손가락을 길러 주는 곳이에요. 학교 PC실이나 집 컴퓨터에서 만나요!
          </p>
        </div>
      </RetroWindow>
    </main>
  );
}

/**
 * 서버가 놓친 기기(데스크톱 모드 아이패드, 터치만 되는 기기)를 화면에서 한 번 더 막아요.
 * 선생님은 막지 않아요.
 */
export function PcOnlyGuard({ isTeacher, children }: { isTeacher: boolean; children: ReactNode }) {
  const mobile = useSyncExternalStore(subscribe, isMobileDevice, () => false);
  if (mobile && !isTeacher) return <PcOnlyNotice />;
  return children;
}
