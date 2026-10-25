// 날짜 기준은 한국 시간(KST). 서버(Vercel)는 UTC라서 따로 맞춥니다.

export function dayKeyKST(t: number | Date = Date.now()) {
  const d = new Date(new Date(t).getTime() + 9 * 3600000);
  return d.toISOString().slice(0, 10);
}
