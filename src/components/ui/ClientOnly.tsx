"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

/**
 * 브라우저에서만 그리는 부분. 이 컴퓨터에 저장된 기록이나 오늘 날짜처럼
 * 서버가 미리 알 수 없는 값을 쓰는 화면을 감쌉니다.
 */
export function ClientOnly({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  return isClient ? children : fallback;
}
