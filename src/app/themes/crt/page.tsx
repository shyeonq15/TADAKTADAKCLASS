import { PixelSprite } from "@/components/pixel/PixelSprite";
import { CLOUD_PALE } from "@/components/pixel/sprites";
import { SAMPLE_STATS, TypingSample } from "../_components/TypingSample";
import { ThemeNav } from "../_components/ThemeNav";

// 시안 B — CRT 레트로 (Retrobit 레퍼런스만 사용)
// 어두운 방 + 브라운관 TV, 하늘색 단색 팔레트, 굵은 남색 타이틀, 주사선(타자 영역 제외)

const NAVY = "#2440a8";
const SCREEN_SKY = "linear-gradient(to bottom, #9cc8f2 0 30%, #b4d6f6 30% 55%, #cbe3f9 55% 78%, #dcecfb 78% 100%)";
const SCANLINES = "repeating-linear-gradient(to bottom, rgba(22,32,92,0.07) 0 2px, transparent 2px 4px)";

// 픽셀 폰트를 굵게 보이게: 오른쪽·아래로 1칸씩 같은 색 그림자
const FAT = { textShadow: `3px 0 0 ${NAVY}, 0 3px 0 ${NAVY}, 3px 3px 0 ${NAVY}` };
const WHITE_OUTLINED = {
  color: "#ffffff",
  textShadow: [-2, 0, 2]
    .flatMap((x) => [-2, 0, 2].map((y) => `${x}px ${y}px 0 ${NAVY}`))
    .join(", "),
};

export default function CrtTheme() {
  return (
    <main className="flex-1 bg-[#15171c]">
      <ThemeNav current="crt" />

      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-4 py-12">
        {/* 1. 첫 화면: 브라운관 TV */}
        <div
          className="w-full p-8"
          style={{
            borderRadius: 40,
            background: "linear-gradient(160deg, #4a4c52 0%, #2c2e33 55%, #1f2125 100%)",
            boxShadow: "inset 0 0 0 4px #5a5c62, 0 24px 0 -8px #0c0d10",
          }}
        >
          <div
            className="relative flex aspect-[16/9] flex-col items-center justify-center overflow-hidden text-center"
            style={{ borderRadius: "48px / 40px", background: SCREEN_SKY }}
          >
            <PixelSprite sprite={CLOUD_PALE} scale={8} className="absolute -bottom-6 -left-10" />
            <PixelSprite sprite={CLOUD_PALE} scale={8} className="absolute -bottom-10 left-[30%]" />
            <PixelSprite sprite={CLOUD_PALE} scale={8} className="absolute -bottom-4 -right-12" />
            <PixelSprite sprite={CLOUD_PALE} scale={6} className="absolute left-[8%] top-[18%]" />
            <PixelSprite sprite={CLOUD_PALE} scale={5} className="absolute right-[10%] top-[10%]" />

            <div className="relative">
              <p className="font-title text-body tracking-[0.3em]" style={{ color: NAVY }}>
                BY 정보실 · 2026
              </p>
              <p className="mt-1 font-title text-title" style={{ color: NAVY }}>
                오늘의 타자 미션
              </p>
              <h1 className="mt-4 font-title text-[80px] leading-none tracking-wider" style={{ color: NAVY, ...FAT }}>
                타닥타닥 우리반
              </h1>
              <p className="mt-5 font-title text-title tracking-[0.2em]" style={WHITE_OUTLINED}>
                TADAK TADAK CLASS
              </p>
              <p
                className="blink mx-auto mt-10 w-fit border-3 bg-white px-8 py-2 font-title text-body"
                style={{ borderColor: NAVY, color: NAVY, borderRadius: 6 }}
              >
                PRESS ENTER ▶
              </p>
            </div>

            {/* 주사선: TV 화면에만 */}
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SCANLINES }} />
            {/* 화면 테두리: 구름 위에 덮어서 끊기지 않게 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ borderRadius: "48px / 40px", boxShadow: "inset 0 0 0 6px #10121a" }}
            />
          </div>
        </div>

        {/* 2. 타자 영역: TV 밖, 주사선 없음 */}
        <section className="w-full">
          <div className="mb-3 flex gap-3">
            {SAMPLE_STATS.map((s) => (
              <div key={s.label} className="flex-1 border-3 bg-[#dcecfb] px-4 py-2" style={{ borderColor: NAVY }}>
                <p className="font-title text-small tracking-widest" style={{ color: NAVY }}>
                  {s.label}
                </p>
                <p className="font-title text-stat" style={{ color: NAVY }}>
                  {s.value} <span className="font-pixel text-small text-text-muted">{s.diff}</span>
                </p>
              </div>
            ))}
          </div>
          <TypingSample className="border-3 border-[#9cc8f2]" />
        </section>

        {/* 3. 보상: 작은 TV 화면 느낌 */}
        <section
          className="relative w-full overflow-hidden px-8 py-6 text-center"
          style={{ borderRadius: 24, background: SCREEN_SKY, boxShadow: "inset 0 0 0 6px #2c2e33" }}
        >
          <p className="font-pixel text-hero font-bold" style={{ color: NAVY, ...FAT }}>
            NEW RECORD!
          </p>
          <p className="mt-3 font-title text-heading" style={WHITE_OUTLINED}>
            코인 30개를 획득했다!
          </p>
          <p className="mt-2 font-pixel text-body" style={{ color: NAVY }}>
            어제의 나를 이겼어요 · 우리 반 성장 게이지 87%
          </p>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SCANLINES }} />
        </section>
      </div>
    </main>
  );
}
