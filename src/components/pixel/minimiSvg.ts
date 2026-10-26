// 미니미 그림을 SVG 글자로 만들기 (그림 주소 /api/minimi 와 화면이 같이 써요).
// 미니룸처럼 미니미가 많이 나오는 곳은 그림 주소를 써서, 같은 모양은 브라우저가 한 번만 받게 해요.

import { MINIMI_SLOTS, minimiItem, type MinimiLook } from "@/config/shop";
import { spriteRects } from "./PixelSprite";
import { FUR_COLORS, MINIMI_BODY, MINIMI_LAYERS, MINIMI_SIZE } from "./minimiArt";

/** 그림 바꾸면 숫자를 올려요 (브라우저에 남은 예전 그림을 새로 받게) */
export const MINIMI_ART_VERSION = 1;

/** 몸 → 목 → 얼굴 → 모자 순서로 겹친 사각형들 */
export function minimiRects(look: MinimiLook | null | undefined) {
  const fur = minimiItem(look?.fur);
  const recolor = fur?.slot === "fur" ? FUR_COLORS[fur.art as keyof typeof FUR_COLORS] : undefined;
  const layers = (["neck", "face", "hat"] as const)
    .map((slot) => minimiItem(look?.[slot]))
    .filter((i) => i && MINIMI_LAYERS[i.art])
    .map((i) => MINIMI_LAYERS[i!.art]);
  return [spriteRects(MINIMI_BODY, recolor), ...layers.map((l) => spriteRects(l))].flat();
}

export function minimiSvg(look: MinimiLook | null | undefined) {
  const rects = minimiRects(look)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MINIMI_SIZE} ${MINIMI_SIZE}" width="${MINIMI_SIZE * 4}" height="${MINIMI_SIZE * 4}" shape-rendering="crispEdges">${rects}</svg>`;
}

/** 미니미 그림 주소 (/api/minimi?hat=…&v=1). 빈 칸은 빼서 같은 모양이면 주소도 같게 */
export function minimiUrl(look: MinimiLook | null | undefined) {
  const q = new URLSearchParams();
  for (const slot of MINIMI_SLOTS) if (look?.[slot]) q.set(slot, look[slot]!);
  q.set("v", String(MINIMI_ART_VERSION));
  return `/api/minimi?${q.toString()}`;
}
