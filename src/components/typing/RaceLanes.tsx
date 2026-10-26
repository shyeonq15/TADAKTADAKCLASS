import type { ReactNode } from "react";
import { Minimi } from "@/components/pixel/Minimi";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BUNNY } from "@/components/pixel/sprites";
import type { MinimiLook } from "@/config/shop";

// DESIGN.md 7장 "대결 레이스": 가로 트랙 여러 줄, 각 줄에 미니미가 진행률만큼 이동.
// 보스전(나 vs 선생님 고스트)과 친구 대결(최대 4명)이 같이 써요.

export type Lane = {
  id: string;
  name: string;
  /** 0 ~ 1 */
  progress: number;
  /** 고스트(보스)는 반투명 */
  ghost?: boolean;
  /** 나는 강조 */
  me?: boolean;
  /** 결승 들어온 순서 등 오른쪽에 붙일 표시 */
  badge?: ReactNode;
  /** 머리 위 말풍선 (이모티콘) */
  bubble?: string;
  /** 상점에서 꾸민 미니미 (없으면 기본 토끼) */
  look?: MinimiLook | null;
};

export function RaceLanes({ lanes }: { lanes: Lane[] }) {
  return (
    <div className="flex flex-col gap-1 border-3 border-navy-900 bg-sky-100 p-2">
      {lanes.map((l) => {
        const p = Math.max(0, Math.min(1, l.progress));
        return (
          <div key={l.id} className={`flex items-center gap-2 ${l.me ? "font-bold" : ""}`}>
            <span className="w-24 shrink-0 truncate font-pixel text-small text-navy-900">
              {l.me ? "▶ " : ""}
              {l.name}
            </span>
            <div className="relative h-10 flex-1 border-b-4 border-road bg-[repeating-linear-gradient(90deg,transparent_0_46px,rgba(22,32,92,0.12)_46px_48px)]">
              {/* 결승선 */}
              <span aria-hidden className="absolute bottom-0 right-0 top-0 w-2 bg-[repeating-linear-gradient(180deg,var(--ink)_0_6px,var(--paper)_6px_12px)]" />
              <div
                className="absolute bottom-0 transition-[left] duration-200 ease-linear"
                style={{ left: `calc(${p * 100}% - ${p * 40}px)` }}
              >
                {l.bubble && (
                  <span className="absolute -top-7 left-4 border-2 border-navy-900 bg-paper px-1 text-body leading-none">{l.bubble}</span>
                )}
                {/* 토끼 그림은 왼쪽을 보고 있어서, 오른쪽으로 달리는 트랙에서는 좌우로 뒤집어요 */}
                {l.look ? (
                  <Minimi look={l.look} scale={2} className={`-scale-x-100 ${l.ghost ? "opacity-40" : ""}`} />
                ) : (
                  <PixelSprite sprite={BUNNY} scale={2} className={`-scale-x-100 ${l.ghost ? "opacity-40" : ""}`} />
                )}
              </div>
            </div>
            <span className="w-14 shrink-0 text-right font-pixel text-small text-navy-900">
              {l.badge ?? `${Math.round(p * 100)}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
