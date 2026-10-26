import type { CSSProperties } from "react";
import type { MinimiLook } from "@/config/shop";
import { MINIMI_SIZE } from "./minimiArt";
import { minimiRects } from "./minimiSvg";

type Props = {
  look?: MinimiLook | null;
  /** 정수 배율만 (DESIGN.md 4장) */
  scale?: 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
  className?: string;
  style?: CSSProperties;
  /** 화면 읽기 프로그램용 이름 (없으면 장식으로 처리) */
  label?: string;
};

/** 내 미니미(픽셀 토끼). 몸 → 목 → 얼굴 → 모자 순서로 겹쳐 그려요. */
export function Minimi({ look, scale = 4, className, style, label }: Props) {
  const rects = minimiRects(look);

  return (
    <svg
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
      style={style}
      width={MINIMI_SIZE * scale}
      height={MINIMI_SIZE * scale}
      viewBox={`0 0 ${MINIMI_SIZE} ${MINIMI_SIZE}`}
      shapeRendering="crispEdges"
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
