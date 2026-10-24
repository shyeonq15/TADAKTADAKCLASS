/** 불러오는 동안 보이는 자리 표시 */
export function Loading({ text = "불러오는 중..." }: { text?: string }) {
  return <p className="blink py-16 text-center font-title text-heading text-navy-900">{text}</p>;
}
