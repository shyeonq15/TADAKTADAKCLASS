import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BALLOON, BUNNY, CLOUD, COIN, SPARKLE, SPEECH } from "@/components/pixel/sprites";
import { SAMPLE_STATS, TypingSample } from "../_components/TypingSample";
import { ThemeNav } from "../_components/ThemeNav";

// 시안 A — 픽셀 포스터 (낭만수집단 레퍼런스만 사용)
// 하늘→민트 계단 그라데이션 + 체크무늬, 연두 외곽선 타이틀, 검은 라벨, 크림 토끼·연두 풍선

const STEPPED_SKY =
  "linear-gradient(to bottom, #3fa9f5 0 22%, #5cbcf7 22% 44%, #78d3f0 44% 68%, #8ff0d8 68% 100%)";
const CHECKER =
  "repeating-conic-gradient(rgba(255,255,255,0.13) 0 25%, transparent 0 50%) 0 0 / 32px 32px";

function BlackLabel({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-3 bg-ink px-4 py-2 font-pixel text-body text-paper">
      <strong className="font-pixel font-bold tracking-wider">{tag}</strong>
      {children}
    </p>
  );
}

export default function PosterTheme() {
  return (
    <main className="relative flex-1 overflow-hidden" style={{ background: `${CHECKER}, ${STEPPED_SKY}` }}>
      <ThemeNav current="poster" />

      {/* 배경 장식: 가장자리에만 */}
      <PixelSprite sprite={BUNNY} scale={5} className="absolute left-10 top-24" />
      <PixelSprite sprite={BUNNY} scale={4} className="absolute right-24 top-[560px] -scale-x-100" />
      <PixelSprite sprite={BUNNY} scale={6} className="absolute bottom-10 left-6" />
      <PixelSprite sprite={BALLOON} scale={6} className="absolute right-10 top-20" />
      <PixelSprite sprite={BALLOON} scale={5} className="absolute left-16 top-[620px]" />
      <PixelSprite sprite={SPARKLE} scale={5} className="absolute left-[22%] top-40" />
      <PixelSprite sprite={SPARKLE} scale={4} className="absolute right-[24%] top-28" />
      <PixelSprite sprite={SPARKLE} scale={4} className="absolute right-[12%] top-[440px]" />
      <PixelSprite sprite={CLOUD} scale={4} className="absolute -left-6 top-[380px]" />
      <PixelSprite sprite={CLOUD} scale={5} className="absolute -right-8 top-[260px]" />
      <PixelSprite sprite={CLOUD} scale={4} className="absolute bottom-24 right-[30%]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pb-24 pt-20 text-center">
        {/* 1. 첫 화면 */}
        <div className="relative">
          <PixelSprite sprite={SPEECH} scale={4} className="absolute -left-16 -top-10" />
          <p className="pixel-corners mx-auto mb-4 w-fit bg-lime-200 px-5 py-1 font-title text-heading text-lime-800">
            1학년 모여라
          </p>
          <h1 className="title-lime text-[64px] leading-tight">타닥타닥 우리반</h1>
        </div>

        <div className="flex flex-col items-center gap-3">
          <BlackLabel tag="MISSION">오늘은 괄호 친구들을 만나러 가요</BlackLabel>
          <BlackLabel tag="> ITEM">연습 티켓(을)를 획득했다!</BlackLabel>
        </div>

        <p className="font-pixel text-body leading-8 text-navy-900">
          수업 전 5분, 손가락을 깨우는 시간.
          <br />
          어제의 나보다 조금만 더 빨라지면, 우리 반이 함께 강해져요!
        </p>

        <button className="border-3 border-navy-900 bg-lime-400 px-8 py-3 font-title text-heading text-navy-900 shadow-pixel-md">
          ▶ 오늘의 미션 시작
        </button>

        {/* 2. 타자 영역: 장식 없이 */}
        <section className="mt-10 w-full text-left">
          <div className="mb-3 flex gap-3">
            {SAMPLE_STATS.map((s) => (
              <div key={s.label} className="flex-1 border-3 border-navy-900 bg-sky-50 px-4 py-2">
                <p className="font-pixel text-small text-text-muted">{s.label}</p>
                <p className="font-title text-stat text-navy-900">
                  {s.value} <span className="font-pixel text-small text-lime-600">{s.diff}</span>
                </p>
              </div>
            ))}
          </div>
          <TypingSample className="border-3 border-navy-900" />
        </section>

        {/* 3. 보상 */}
        <section className="mt-6 flex w-full flex-col items-center gap-4">
          <div className="flex gap-2">
            <PixelSprite sprite={COIN} scale={5} />
            <PixelSprite sprite={COIN} scale={5} className="-translate-y-3" />
            <PixelSprite sprite={COIN} scale={5} />
          </div>
          <p className="title-lime text-title font-bold" style={{ fontFamily: "Galmuri11, monospace" }}>
            NEW RECORD!
          </p>
          <div className="w-full border-3 border-paper bg-ink px-5 py-4 text-left font-pixel text-body text-paper outline-3 outline-ink">
            &gt; 코인 30개를 획득했다!
            <br />
            &gt; 우리 반 성장 게이지가 87%가 되었다! <span className="blink">▼</span>
          </div>
        </section>
      </div>
    </main>
  );
}
