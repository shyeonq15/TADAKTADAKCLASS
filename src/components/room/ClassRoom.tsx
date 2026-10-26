import { minimiUrl } from "@/components/pixel/minimiSvg";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { ROOM_ART, ROOM_SURFACES } from "@/components/pixel/roomArt";
import { SPARKLE } from "@/components/pixel/sprites";
import { ROOM_H, ROOM_W, ROOM_WALL_H, roomItem } from "@/config/shop";
import type { RoomMember } from "@/lib/room/server";

type Props = {
  wall: string;
  floor: string;
  furniture: readonly string[];
  members: readonly RoomMember[];
  meId?: string;
  /** 입혀 보기: 아직 안 산 아이템을 반투명으로 */
  preview?: string | null;
};

/** 미니미 크기 (픽셀 칸). 30명이 서도 가구가 보이게 조금 작게 */
const MINIMI = 11;
const PER_ROW = 12;
/** 바닥에서 미니미 줄이 시작하는 높이 */
const ROWS_Y = [61, 69, 77, 85];

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** 우리 반 미니룸: 벽지·바닥 → 가구 → 반 친구 미니미 순서로 그려요. 크기는 부모 너비에 맞춰 늘어나요. */
export function ClassRoom({ wall, floor, furniture, members, meId, preview }: Props) {
  const previewItem = roomItem(preview ?? undefined);
  const wallId = previewItem?.kind === "wall" ? previewItem.id : wall;
  const floorId = previewItem?.kind === "floor" ? previewItem.id : floor;
  const pieces = [...furniture, ...(previewItem?.kind === "furniture" && !furniture.includes(previewItem.id) ? [previewItem.id] : [])]
    .map((id) => roomItem(id))
    .filter((i) => i?.at && ROOM_ART[i.art]);

  const done = members.filter((m) => m.doneToday).length;
  // 친구가 적으면 줄을 바닥 가운데쯤으로 내려요
  const lift = (3 - Math.min(3, Math.ceil(members.length / PER_ROW))) * 4;

  return (
    <div
      role="img"
      aria-label={`우리 반 미니룸: 친구 ${members.length}명, 오늘 미션 완료 ${done}명`}
      className="relative w-full overflow-hidden border-4 border-navy-900"
      style={{ aspectRatio: `${ROOM_W} / ${ROOM_H}` }}
    >
      <div className="absolute inset-x-0 top-0" style={{ height: pct(ROOM_WALL_H, ROOM_H), ...ROOM_SURFACES[wallId] }} />
      <div
        className="absolute inset-x-0 bottom-0 border-t-4 border-navy-900"
        style={{ height: pct(ROOM_H - ROOM_WALL_H, ROOM_H), ...ROOM_SURFACES[floorId] }}
      />

      {pieces.map((item) => {
        const art = ROOM_ART[item!.art];
        const w = Math.max(...art.rows.map((r) => r.length));
        const [x, y] = item!.at!;
        return (
          <div
            key={item!.id}
            className={`absolute ${item!.id === previewItem?.id && !furniture.includes(item!.id) ? "opacity-60" : ""}`}
            style={{ left: pct(x, ROOM_W), top: pct(y, ROOM_H), width: pct(w, ROOM_W) }}
          >
            <PixelSprite sprite={art} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        );
      })}

      {members.map((m, i) => {
        const row = Math.floor(i / PER_ROW);
        const col = i % PER_ROW;
        const inRow = Math.min(PER_ROW, members.length - row * PER_ROW);
        // 줄마다 가운데 정렬하고, 짝수 줄은 반 칸 밀어서 겹치지 않게
        const gap = (ROOM_W - 8) / PER_ROW;
        const x = (ROOM_W - inRow * gap) / 2 + col * gap + (row % 2 ? gap / 3 : 0);
        const y = ROWS_Y[Math.min(row, ROWS_Y.length - 1)] + lift;
        const me = m.id === meId;
        return (
          <div
            key={m.id}
            title={`${m.nickname}${m.doneToday ? " · 오늘 미션 완료!" : ""}`}
            className="absolute"
            style={{ left: pct(x, ROOM_W), top: pct(y, ROOM_H), width: pct(MINIMI, ROOM_W) }}
          >
            {m.doneToday && (
              <PixelSprite sprite={SPARKLE} className="absolute -top-1 right-1 w-[22%]" style={{ height: "auto" }} />
            )}
            {/* 친구가 많아도 가볍게: 그림 주소로 (같은 모양은 한 번만 받아요) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={minimiUrl(m.look)} alt="" width={64} height={64} className="block h-auto w-full" style={{ imageRendering: "pixelated" }} />
            {me && (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 border-2 border-navy-900 bg-yellow-400 px-1 font-pixel text-small leading-none text-navy-900">
                나
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
