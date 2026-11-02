"use client";


import { GAMES, QUIZ_GAMES } from "@/config/game";
import { Field } from "../rain/RainGame";
import { SoloGameFlow } from "../SoloGameFlow";

/** 비트 해독기: 떨어지는 이진수·십진수·ASCII 문제를 풀어서 답을 쳐요 (정보 교과 이진수 복습) */
export function BitsGame() {
  return (
    <SoloGameFlow
      game="bits"
      Field={Field}
      fixedTrack={QUIZ_GAMES.bits.track}
      mission="떨어지는 이진수를 십진수로 바꿔 치고 Enter!"
      rules={[
        "1101₂ = ? → 8+4+1 = 13 을 쳐요 · 자릿값 8 4 2 1 을 떠올려요",
        "맞힐수록 13 = ?₂ (이진수 쓰기)와 5비트(16 8 4 2 1)도 나와요",
        `♥ 하트 ${GAMES.rain.hearts}개 · 바닥에 닿으면 하나씩 줄어요 · 맞힐수록 빨라져요`,
      ]}
      loadingText="비트를 모으는 중..."
      hitLabel="해독한 문제"
    />
  );
}
