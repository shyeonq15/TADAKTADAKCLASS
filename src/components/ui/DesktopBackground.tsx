import type { ReactNode } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BALLOON, BUNNY, CLOUD, SPARKLE } from "@/components/pixel/sprites";

// 앱 공통 바탕화면 (테마 시안 D: 포스터 하늘 × Y2K 바탕화면).
// 테마를 바꾸려면 이 파일만 고치면 됩니다.

const STEPPED_SKY =
  "linear-gradient(to bottom, var(--sky-500) 0 22%, #5cbcf7 22% 44%, #78d3f0 44% 68%, var(--mint-300) 68% 100%)";
const CHECKER = "repeating-conic-gradient(rgba(255,255,255,0.13) 0 25%, transparent 0 50%) 0 0 / 32px 32px";
const HILLS = [
  "radial-gradient(ellipse 140% 18% at 50% 104%, var(--lime-400) 0 58%, transparent 58.3%)",
  "radial-gradient(ellipse 80% 14% at 12% 100%, var(--lime-600) 0 60%, transparent 60.3%)",
].join(", ");

type Props = {
  children: ReactNode;
  /** 타자 치는 화면: 장식 그림을 빼서 집중하게 */
  quiet?: boolean;
};

export function DesktopBackground({ children, quiet = false }: Props) {
  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
      style={{ background: `${HILLS}, ${CHECKER}, ${STEPPED_SKY}`, backgroundAttachment: "fixed" }}
    >
      {!quiet && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <PixelSprite sprite={CLOUD} scale={5} className="absolute -left-10 top-40" />
          <PixelSprite sprite={CLOUD} scale={4} className="absolute -right-6 top-72" />
          <PixelSprite sprite={SPARKLE} scale={4} className="absolute left-[14%] top-24" />
          <PixelSprite sprite={SPARKLE} scale={4} className="absolute right-[12%] top-[60%]" />
          <PixelSprite sprite={BALLOON} scale={5} className="absolute right-6 top-20" />
          <PixelSprite sprite={BUNNY} scale={5} className="absolute bottom-6 left-6" />
        </div>
      )}
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
