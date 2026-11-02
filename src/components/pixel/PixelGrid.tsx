import { PIXEL_PALETTES, PIXEL_SIZE } from "@/config/pixel";

/** 0·1(또는 0~3) 숫자 줄 → 픽셀 그림. 아직 안 친 칸은 빈 칸으로 보여요 */
export function PixelGrid({
  rows,
  bits,
  cell = 12,
  ghost,
  label,
}: {
  rows: readonly string[];
  bits: 1 | 2;
  cell?: number;
  /** 따라 치기: 아직 안 친 칸에 연하게 보여 줄 목표 그림 */
  ghost?: readonly string[];
  label?: string;
}) {
  const palette = PIXEL_PALETTES[bits];
  const size = PIXEL_SIZE * cell;
  const rects = [];
  for (let y = 0; y < PIXEL_SIZE; y++) {
    for (let x = 0; x < PIXEL_SIZE; x++) {
      const ch = rows[y]?.[x];
      const n = ch === undefined ? NaN : Number(ch);
      if (Number.isInteger(n) && palette[n]) {
        rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[n]} />);
      } else if (ghost) {
        const g = Number(ghost[y]?.[x]);
        if (g > 0) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={palette[g]} opacity={0.18} />);
      }
    }
  }
  return (
    <svg
      viewBox={`0 0 ${PIXEL_SIZE} ${PIXEL_SIZE}`}
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      shapeRendering="crispEdges"
      className="border-3 border-navy-900 bg-[repeating-conic-gradient(#e9e4cf_0_25%,#fffdf3_0_50%)] [background-size:12.5%_12.5%]"
    >
      {rects}
    </svg>
  );
}
