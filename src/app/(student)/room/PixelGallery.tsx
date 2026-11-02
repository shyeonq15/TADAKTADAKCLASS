"use client";

import { useRouter } from "next/navigation";
import { PixelGrid } from "@/components/pixel/PixelGrid";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { safeCall } from "@/lib/practice/call";
import type { PixelArt } from "@/lib/pixel/server";
import { deleteMyPixel } from "../actions";

/** 우리 반 픽셀 갤러리: 친구들이 0과 1로 그린 그림 */
export function PixelGallery({ arts }: { arts: PixelArt[] }) {
  const router = useRouter();
  return (
    <RetroWindow title="🖼️ 우리 반 픽셀 갤러리">
      {arts.length === 0 ? (
        <p className="font-pixel text-body text-text-muted">아직 걸린 그림이 없어요. 첫 그림을 걸어 봐요!</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {arts.map((a) => (
            <li key={a.id} className="flex flex-col items-center gap-1 font-pixel text-small">
              <PixelGrid rows={a.rows} bits={a.bits} cell={6} label={`${a.nickname}의 그림: ${a.title}`} />
              <span className="max-w-full truncate font-bold">{a.title}</span>
              <span className="text-text-muted">{a.nickname}</span>
              {a.mine && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm("이 그림을 내릴까요?")) return;
                    await safeCall(() => deleteMyPixel(a.id));
                    router.refresh();
                  }}
                  className="underline underline-offset-2"
                >
                  내리기
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <PixelLink href="/pixel" size="sm" variant="success" className="mt-3">
        0과 1로 그림 그리기
      </PixelLink>
    </RetroWindow>
  );
}
