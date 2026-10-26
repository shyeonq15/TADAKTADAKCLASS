import { JAMO_TO_KEY } from "@/lib/typing/hangul";

// 반 약한 키 히트맵 (PRD T3). 틀린 글자(한글 자모·영문·기호)를 실제 키보드 자리로 모아서 색으로 보여 줘요.

const ROWS = ["`1234567890-=", "qwertyuiop[]\\", "asdfghjkl;'", "zxcvbnm,./"];
const ROW_INDENT = [0, 1.5, 1.8, 2.3];

/** Shift 를 눌러야 나오는 기호 → 같은 자리의 키 */
const SHIFTED: Record<string, string> = {
  "~": "`", "!": "1", "@": "2", "#": "3", $: "4", "%": "5", "^": "6", "&": "7", "*": "8", "(": "9", ")": "0",
  _: "-", "+": "=", "{": "[", "}": "]", "|": "\\", ":": ";", '"': "'", "<": ",", ">": ".", "?": "/",
};

const KEY_TO_JAMO: Record<string, string> = Object.fromEntries(
  Object.entries(JAMO_TO_KEY)
    .filter(([, k]) => k === k.toLowerCase())
    .map(([j, k]) => [k, j]),
);

/** 틀린 글자 → 키보드 자리 (모르면 null) */
export function keyOf(ch: string): string | null {
  if (JAMO_TO_KEY[ch]) return JAMO_TO_KEY[ch].toLowerCase();
  if (SHIFTED[ch]) return SHIFTED[ch];
  const low = ch.toLowerCase();
  return ROWS.some((r) => r.includes(low)) ? low : null;
}

/** 0 → 크림, 1 → 진한 분홍빨강 */
function heat(t: number) {
  if (t <= 0) return "#fffdf5";
  const stops = [
    [255, 246, 214],
    [255, 216, 77],
    [255, 122, 182],
    [232, 68, 58],
  ];
  const x = Math.min(0.999, t) * (stops.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
  return `rgb(${c.join(",")})`;
}

export function KeyHeatmap({ counts }: { counts: Record<string, number> }) {
  const byKey: Record<string, number> = {};
  for (const [ch, n] of Object.entries(counts)) {
    const k = keyOf(ch);
    if (k) byKey[k] = (byKey[k] ?? 0) + n;
  }
  const max = Math.max(1, ...Object.values(byKey));

  return (
    <div className="inline-flex flex-col gap-1 border-3 border-navy-900 bg-[#c4c0b8] p-2" aria-label="자주 틀리는 키 키보드 그림">
      {ROWS.map((row, r) => (
        <div key={row} className="flex gap-1" style={{ paddingLeft: `${ROW_INDENT[r] * 16}px` }}>
          {[...row].map((k) => {
            const n = byKey[k] ?? 0;
            return (
              <div
                key={k}
                title={`${k.toUpperCase()}${KEY_TO_JAMO[k] ? ` (${KEY_TO_JAMO[k]})` : ""}: ${n}번`}
                className="flex h-11 w-11 flex-col items-center justify-center border-2 border-navy-900 font-typing leading-none text-navy-900"
                style={{ background: heat(n / max) }}
              >
                <span className="text-body font-bold">{k.toUpperCase()}</span>
                {KEY_TO_JAMO[k] && <span className="text-small">{KEY_TO_JAMO[k]}</span>}
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-1 flex items-center gap-2 px-1 font-pixel text-small text-navy-900">
        <span>적게</span>
        <span className="h-3 w-32 border border-navy-900" style={{ background: `linear-gradient(90deg, ${heat(0.01)}, ${heat(0.4)}, ${heat(0.7)}, ${heat(0.99)})` }} />
        <span>많이 틀림</span>
      </div>
    </div>
  );
}
