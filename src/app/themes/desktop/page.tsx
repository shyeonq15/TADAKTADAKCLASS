import type { ReactNode } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { COIN, FOLDER, HEART, NOTE, SMILEY, SPARKLE, THUMBS } from "@/components/pixel/sprites";
import { SAMPLE_STATS, TypingSample } from "../_components/TypingSample";
import { ThemeNav } from "../_components/ThemeNav";
import { Win98 } from "../_components/Win98";

// 시안 C — Y2K 바탕화면 (선물하기로 놀러오r.. 레퍼런스만 사용)
// 파란 하늘 + 초원 바탕화면, 바탕화면 아이콘, 윈도우 98 창, 연두 글자 + 흰 외곽, 싸이월드 말투

const DESKTOP_BG = [
  "radial-gradient(ellipse 140% 55% at 50% 108%, #4ea323 0 58%, transparent 58.3%)",
  "radial-gradient(ellipse 90% 40% at 15% 100%, #6cc436 0 60%, transparent 60.3%)",
  "linear-gradient(to bottom, #2a6fd6 0%, #4b95ec 30%, #8cc4ff 58%, #cfe7ff 80%)",
].join(", ");

const GREEN = "#7ed321";
const DARK_GREEN = "#2e6b14";
const ring = (r: number, color: string) =>
  [-r, 0, r].flatMap((x) => [-r, 0, r].map((y) => `${x}px ${y}px 0 ${color}`));
const Y2K_TITLE = {
  color: GREEN,
  textShadow: [...ring(2, DARK_GREEN), ...ring(5, "#ffffff"), "6px 7px 0 rgba(22,32,92,0.35)"].join(", "),
};

function DesktopIcon({ children, label, className }: { children: ReactNode; label?: string; className: string }) {
  return (
    <div className={`absolute flex flex-col items-center gap-1 ${className}`}>
      {children}
      {label && (
        <span className="border-2 border-navy-900 bg-paper px-2 font-pixel text-small text-navy-900">{label}</span>
      )}
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
        className="win-bevel-pressed h-9 w-44 bg-paper px-2 font-pixel text-body outline-none"
      />
    </label>
  );
}

export default function DesktopTheme() {
  return (
    <main className="flex-1" style={{ background: DESKTOP_BG, backgroundAttachment: "fixed" }}>
      <ThemeNav current="desktop" />

      {/* 1. 첫 화면: 바탕화면 + 로그인 창 */}
      <div className="relative mx-auto h-[720px] max-w-5xl">
        <DesktopIcon className="left-6 top-8" label="(2026 1학년)">
          <PixelSprite sprite={HEART} scale={5} />
        </DesktopIcon>
        <DesktopIcon className="right-10 top-10">
          <PixelSprite sprite={NOTE} scale={6} />
        </DesktopIcon>
        <DesktopIcon className="left-4 top-[300px]">
          <PixelSprite sprite={SMILEY} scale={5} />
        </DesktopIcon>
        <DesktopIcon className="bottom-16 left-10" label="연습팩">
          <PixelSprite sprite={FOLDER} scale={6} />
        </DesktopIcon>
        <DesktopIcon className="bottom-14 right-8" label="10/27 ~ 10/31">
          <PixelSprite sprite={THUMBS} scale={6} />
        </DesktopIcon>

        <Win98 title="타닥타닥우리반.exe" className="absolute left-1/2 top-20 w-[560px] -translate-x-1/2">
          <div className="bg-linear-to-b from-[#f7fbef] to-[#dff3c4] px-8 pb-6 pt-6 text-center">
            <PixelSprite sprite={SPARKLE} scale={4} className="absolute left-14 top-24" />
            <p className="font-pixel text-heading font-bold text-navy-900">1학년</p>
            <div className="relative mx-auto my-4 w-fit px-10 py-6">
              <div
                aria-hidden
                className="absolute inset-0 border-[5px] border-paper"
                style={{ borderRadius: "50%", transform: "rotate(-6deg)" }}
              />
              <h1 className="relative font-pixel text-[48px] font-bold leading-[1.15]" style={Y2K_TITLE}>
                타닥타닥 우리반에
                <br />
                놀러오r..
              </h1>
            </div>
          </div>
          <div className="flex items-stretch justify-center gap-4 px-8 py-5">
            <div className="flex flex-col gap-2">
              <Field label="반 코드" value="1-3" />
              <Field label="PIN" value="1234" type="password" />
            </div>
            <button className="win-bevel w-28 bg-[#cfe9b0] font-pixel text-body font-bold text-navy-900 active:win-bevel-pressed">
              로그인
            </button>
          </div>
          <div className="border-t-2 border-win-shadow px-8 py-4 text-center">
            <button className="win-bevel h-10 px-6 font-pixel text-body text-navy-900 active:win-bevel-pressed">
              🌐 학교 구글 계정으로 로그인
            </button>
          </div>
        </Win98>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 pb-24">
        {/* 2. 타자 영역 */}
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

        {/* 3. 보상: 윈도우 알림창 */}
        <Win98 title="알림" className="mx-auto w-[420px]">
          <div className="flex items-center gap-5 px-6 py-6">
            <PixelSprite sprite={COIN} scale={6} />
            <div className="font-pixel text-body text-navy-900">
              <p className="font-bold">코인 30개를 획득했다!</p>
              <p className="mt-1 text-small">어제의 나를 이겼어요.. 오늘도 수고했어요 ♡</p>
            </div>
          </div>
          <div className="pb-5 text-center">
            <button className="win-bevel h-9 w-24 font-pixel text-body text-navy-900 active:win-bevel-pressed">
              확인
            </button>
          </div>
        </Win98>
      </div>
    </main>
  );
}
