import type { ReactNode } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BALLOON, BUNNY, CLOUD, COIN, FOLDER, HEART, SPARKLE, SPEECH, THUMBS } from "@/components/pixel/sprites";
import { SAMPLE_STATS, TypingSample } from "../_components/TypingSample";
import { ThemeNav } from "../_components/ThemeNav";
import { Win98 } from "../_components/Win98";

// 시안 D — A 픽셀 포스터 × C Y2K 바탕화면
// 바탕(A): 하늘→민트 계단 그라데이션 + 체크무늬 + 연두 언덕, 토끼·풍선·구름은 가장자리에만
// 그 위(C): 윈도우 98 창과 바탕화면 아이콘
// 창 안(A): 연두 외곽선 타이틀, 검은 라벨, 연두 시작 버튼

const STEPPED_SKY =
  "linear-gradient(to bottom, #3fa9f5 0 22%, #5cbcf7 22% 44%, #78d3f0 44% 68%, #8ff0d8 68% 100%)";
const CHECKER =
  "repeating-conic-gradient(rgba(255,255,255,0.13) 0 25%, transparent 0 50%) 0 0 / 32px 32px";
// C의 초원 언덕을 A 팔레트(연두)로 바꾸고 계단처럼 두 겹만
const HILLS = [
  "radial-gradient(ellipse 140% 30% at 50% 104%, var(--lime-400) 0 58%, transparent 58.3%)",
  "radial-gradient(ellipse 80% 22% at 12% 100%, var(--lime-600) 0 60%, transparent 60.3%)",
].join(", ");

function BlackLabel({ tag, children }: { tag: string; children: ReactNode }) {
  return (
    <p className="inline-flex items-center gap-3 bg-ink px-4 py-2 font-pixel text-body text-paper">
      <strong className="font-pixel font-bold tracking-wider">{tag}</strong>
      {children}
    </p>
  );
}

function DesktopIcon({ children, label, className }: { children: ReactNode; label: string; className: string }) {
  return (
    <div className={`absolute flex flex-col items-center gap-1 ${className}`}>
      {children}
      <span className="border-2 border-navy-900 bg-paper px-2 font-pixel text-small text-navy-900">{label}</span>
    </div>
  );
}

function Field({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  return (
    <label className="flex items-center gap-3 font-pixel text-body text-navy-900">
      <span className="w-16 font-bold">{label}</span>
      <input
        readOnly
        type={type}
        defaultValue={value}
        className="win-bevel-pressed h-9 w-40 bg-paper px-2 font-pixel text-body outline-none"
      />
    </label>
  );
}

export default function MixTheme() {
  return (
    <main
      className="relative flex-1 overflow-hidden"
      style={{ background: `${HILLS}, ${CHECKER}, ${STEPPED_SKY}`, backgroundAttachment: "fixed" }}
    >
      <ThemeNav current="mix" />

      {/* 1. 첫 화면: 포스터 바탕화면 + 로그인 창 */}
      <div className="relative mx-auto h-[760px] max-w-5xl">
        {/* A 장식 */}
        <PixelSprite sprite={BALLOON} scale={6} className="absolute right-6 top-6" />
        <PixelSprite sprite={BUNNY} scale={5} className="absolute bottom-24 right-36 -scale-x-100" />
        <PixelSprite sprite={CLOUD} scale={5} className="absolute -left-10 top-[180px]" />
        <PixelSprite sprite={CLOUD} scale={4} className="absolute -right-6 top-[300px]" />
        <PixelSprite sprite={SPARKLE} scale={4} className="absolute left-[18%] top-12" />
        <PixelSprite sprite={SPARKLE} scale={5} className="absolute right-[16%] top-[520px]" />

        {/* C 바탕화면 아이콘 */}
        <DesktopIcon className="left-6 top-8" label="내 미니미">
          <PixelSprite sprite={BUNNY} scale={4} />
        </DesktopIcon>
        <DesktopIcon className="left-8 top-[330px]" label="우리 반">
          <PixelSprite sprite={HEART} scale={5} />
        </DesktopIcon>
        <DesktopIcon className="bottom-16 left-10" label="연습팩">
          <PixelSprite sprite={FOLDER} scale={6} />
        </DesktopIcon>
        <DesktopIcon className="bottom-20 right-8" label="반 대결">
          <PixelSprite sprite={THUMBS} scale={6} />
        </DesktopIcon>

        <Win98 title="타닥타닥우리반.exe" className="absolute left-1/2 top-16 w-[580px] -translate-x-1/2">
          <div className="relative bg-cream px-8 pb-6 pt-8 text-center">
            <PixelSprite sprite={SPEECH} scale={3} className="absolute left-8 top-6" />
            <p className="pixel-corners mx-auto mb-3 w-fit bg-lime-200 px-5 py-1 font-title text-heading text-lime-800">
              1학년 모여라
            </p>
            <h1 className="title-lime text-[52px] leading-tight">타닥타닥 우리반</h1>
            <p className="mt-1 font-pixel text-small tracking-[0.3em] text-navy-700">TADAK TADAK CLASS</p>
            <div className="mt-5 flex flex-col items-center gap-2">
              <BlackLabel tag="MISSION">오늘은 괄호 친구들을 만나러 가요</BlackLabel>
            </div>
          </div>
          <div className="flex items-stretch justify-center gap-4 border-t-2 border-win-shadow px-8 py-5">
            <div className="flex flex-col gap-2">
              <Field label="반 코드" value="1-3" />
              <Field label="PIN" value="1234" type="password" />
            </div>
            <button className="w-36 border-3 border-navy-900 bg-lime-400 font-title text-body text-navy-900 shadow-pixel-md">
              ▶ 시작
            </button>
          </div>
          <div className="pb-4 text-center">
            <button className="win-bevel h-10 px-6 font-pixel text-body text-navy-900 active:win-bevel-pressed">
              🌐 학교 구글 계정으로 로그인
            </button>
          </div>
        </Win98>
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col gap-10 px-4 pb-32">
        {/* 2. 타자 영역: 창 틀만 테마, 안쪽은 장식 없이 */}
        <Win98 title="오늘의 미션 - 한글 문장 연습">
          <div className="flex gap-2 px-3 pt-3">
            {SAMPLE_STATS.map((s) => (
              <div key={s.label} className="win-bevel-pressed flex-1 bg-paper px-3 py-2">
                <p className="font-pixel text-small text-text-muted">{s.label}</p>
                <p className="font-title text-stat text-navy-900">
                  {s.value} <span className="font-pixel text-small text-lime-600">{s.diff}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="p-3">
            <TypingSample className="win-bevel-pressed" />
          </div>
        </Win98>

        {/* 3. 보상: 윈도우 알림창 + A의 검은 대사창 */}
        <Win98 title="알림" className="mx-auto w-[480px]">
          <div className="flex flex-col items-center gap-3 bg-cream px-6 pb-5 pt-6">
            <div className="flex gap-2">
              <PixelSprite sprite={COIN} scale={5} />
              <PixelSprite sprite={COIN} scale={5} className="-translate-y-3" />
              <PixelSprite sprite={COIN} scale={5} />
            </div>
            <p className="title-lime text-title font-bold" style={{ fontFamily: "Galmuri11, monospace" }}>
              NEW RECORD!
            </p>
            <div className="w-full bg-ink px-5 py-4 text-left font-pixel text-body text-paper">
              &gt; 코인 30개를 획득했다!
              <br />
              &gt; 우리 반 성장 게이지가 87%가 되었다! <span className="blink">▼</span>
            </div>
          </div>
          <div className="py-4 text-center">
            <button className="win-bevel h-9 w-24 font-pixel text-body text-navy-900 active:win-bevel-pressed">
              확인
            </button>
          </div>
        </Win98>
      </div>
    </main>
  );
}
