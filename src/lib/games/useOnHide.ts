"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * 다른 메뉴로 갔을 때 한 번 불러요.
 *
 * Next.js(cacheComponents)는 다른 메뉴로 가도 화면을 지우지 않고 숨겨 두었다가, 돌아오면 그대로 다시 보여 줘요.
 * 그래서 게임 중에 나갔다 오면 멈춰 있던 판이 다시 움직이며 꼬였어요 (무적, 입력 안 됨, 시간이 지나도 안 끝남).
 * 숨겨지는 순간 이 함수로 게임 화면을 "그 판은 끝났어요" 상태로 바꿔 두면, 돌아왔을 때 새로 시작할 수 있어요.
 */
export function useOnHide(fn: () => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useLayoutEffect(() => () => ref.current(), []);
}
