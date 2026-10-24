// 부정행위 감지: 사람이 치기 어려운 속도, 너무 일정한 입력 간격.
// 의심 기록은 점수에 바로 넣지 않고 교사 확인으로 넘깁니다.

import { INTEGRITY, type Track } from "@/config/game";

export type IntegrityFlag = "too-fast" | "too-regular";

export function checkIntegrity(track: Track, cpm: number, keyTimes: readonly number[]): IntegrityFlag[] {
  const flags: IntegrityFlag[] = [];
  if (cpm > INTEGRITY.maxCpm[track]) flags.push("too-fast");

  if (keyTimes.length >= INTEGRITY.minKeysForCheck) {
    const gaps = keyTimes.slice(1).map((t, i) => t - keyTimes[i]).filter((g) => g < 2000); // 쉬는 시간은 뺌
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
    if (mean > 0 && sd / mean < INTEGRITY.minIntervalVariation) flags.push("too-regular");
  }
  return flags;
}
