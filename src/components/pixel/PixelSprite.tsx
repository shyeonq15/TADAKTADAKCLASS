import type { CSSProperties } from "react";

export type Sprite = {
  rows: readonly string[];
  /** 글자 하나 → 색. '.'은 투명 */
  palette: Readonly<Record<string, string>>;
};

type Props = {
  sprite: Sprite;
  /** 정수 배율만 (DESIGN.md 4장) */
  scale?: 1 | 2 | 3 | 4 | 5 | 6 | 8;
  className?: string;
  style?: CSSProperties;
};

/** 같은 색이 가로로 이어지면 사각형 하나로 합쳐서 돌려줍니다. palette 로 색을 바꿔 그릴 수 있어요. */
export function spriteRects(sprite: Sprite, recolor?: Readonly<Record<string, string>>) {
  const { rows } = sprite;
  const palette = { ...sprite.palette, ...recolor };
  const rects: { x: number; y: number; w: number; fill: string }[] = [];

  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = palette[ch];
      if (ch === "." || !fill) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === ch) w++;
      rects.push({ x, y, w, fill });
      x += w;
    }
  });
  return rects;
}

/** 문자열 격자로 픽셀 그림을 SVG로 그립니다. */
export function PixelSprite({ sprite, scale = 4, className, style }: Props) {
  const { rows } = sprite;
  const width = Math.max(...rows.map((r) => r.length));
  const rects = spriteRects(sprite);

  return (
    <svg
      aria-hidden
      className={className}
      style={style}
      width={width * scale}
      height={rows.length * scale}
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
