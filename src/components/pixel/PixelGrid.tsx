"use client";

import { PIXEL_PALETTES, type PixelBits } from "@/config/pixel";

/**
 * 색 번호 줄 → 픽셀 그림 (줄마다 글자 하나 = 칸 하나, 16진수 0~f).
 * onPaint 가 있으면 칸을 눌러(끌어서) 색칠할 수 있어요. wrong 칸은 빨간 테두리로 표시해요.
 */
export function PixelGrid({
  rows,
  bits,
  cell = 12,
  label,
  onPaint,
  wrong,
}: {
  rows: readonly string[];
  bits: PixelBits;
  cell?: number;
  label?: string;
  onPaint?: (x: number, y: number) => void;
  wrong?: ReadonlySet<string>;
}) {
  const size = rows.length || 16;
  const palette = PIXEL_PALETTES[bits];
  const px = size * cell;
  const cells = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = parseInt(rows[y]?.[x] ?? "", 16);
      const fill = Number.isInteger(n) && palette[n] ? palette[n] : "transparent";
      cells.push(
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={fill}
          stroke={onPaint ? "#c9d6e8" : undefined}
          strokeWidth={onPaint ? 0.04 : undefined}
          onPointerDown={onPaint ? () => onPaint(x, y) : undefined}
          onPointerEnter={onPaint ? (e) => e.buttons === 1 && onPaint(x, y) : undefined}
        />,
      );
      if (wrong?.has(`${x}-${y}`))
        cells.push(<rect key={`w-${x}-${y}`} x={x + 0.08} y={y + 0.08} width={0.84} height={0.84} fill="none" stroke="#ff3b6b" strokeWidth={0.16} />);
    }
  }
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={px}
      height={px}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      shapeRendering="crispEdges"
      className={`border-3 border-navy-900 bg-paper ${onPaint ? "cursor-crosshair touch-none select-none" : ""}`}
    >
      {cells}
    </svg>
  );
}
