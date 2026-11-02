"use client";

import { GAMES, QUIZ_GAMES } from "@/config/game";
import { Field } from "../rain/RainGame";
import { SoloGameFlow } from "../SoloGameFlow";

/** 입출력 레이스: 떨어지는 장치가 입력이면 i, 출력이면 o, 둘 다면 io (정보 교과 입출력 장치 복습) */
export function IoGame() {
  return (
    <SoloGameFlow
      game="io"
      Field={Field}
      fixedTrack={QUIZ_GAMES.io.track}
      mission="입력 장치면 i, 출력 장치면 o, 둘 다면 io!"
      rules={[
        "키보드 → i (입력) · 스피커 → o (출력) · 터치스크린 → io (둘 다)",
        "영어로 치고 Space나 Enter. 같은 답이 여러 개면 아래쪽부터 터져요",
        `♥ 하트 ${GAMES.rain.hearts}개 · 맞힐수록 빨라져요`,
      ]}
      loadingText="장치를 꺼내는 중..."
      hitLabel="맞힌 장치"
    />
  );
}
