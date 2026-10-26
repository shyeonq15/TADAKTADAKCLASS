// 한 판에 칠 지문 뽑기 (순수 함수). 같은 판 안에서는 같은 지문이 두 번 나오지 않아요.

/** passages 에서 count 개를 무작위로 (count 가 더 크면 전부, 순서는 섞어서) */
export function pickRound<T>(passages: readonly T[], count: number, random: () => number = Math.random): T[] {
  const pool = [...passages];
  const n = Math.max(0, Math.min(count, pool.length));
  // 앞에서부터 n 칸만 섞기 (Fisher–Yates)
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
