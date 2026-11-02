import Link from "next/link";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { RetroWindow } from "@/components/ui/RetroWindow";

const GAMES = [
  { href: "/games/rain", icon: "🌧️", title: "단어 비", desc: "떨어지는 단어를 바닥에 닿기 전에 터뜨려요", ready: true },
  { href: "/games/runner", icon: "🐰", title: "토끼 달리기", desc: "장애물 단어를 쳐서 점프! 멀리 달려요", ready: true },
  { href: "/games/bits", icon: "💾", title: "비트 해독기", desc: "떨어지는 이진수를 풀어요 (이진수·ASCII)", ready: true },
  { href: "/games/io", icon: "🖨️", title: "입출력 레이스", desc: "입력 장치는 i, 출력 장치는 o!", ready: true },
  { href: "/pixel", icon: "🖼️", title: "0과 1 픽셀 아트", desc: "숫자로 그림을 그려 우리 반 갤러리에 걸어요", ready: true },
  { href: "/games/boss", icon: "👾", title: "보스전", desc: "선생님 기록(고스트)과 레이스해요", ready: true },
  { href: "/games/race", icon: "🏁", title: "친구 대결", desc: "반 친구와 실시간 레이스 (최대 4명)", ready: true },
  { href: "/hall", icon: "🏆", title: "명예의 전당", desc: "우리 학년 부문별 최고 기록 TOP 10", ready: true },
] as const;

export default function GamesPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="title-lime mb-6 text-center text-title">게임</h1>
        <div className="grid gap-5 md:grid-cols-2">
          {GAMES.map((g) => {
            const body = (
              <RetroWindow title={`${g.title}.exe`} className={g.ready ? "transition-transform hover:-translate-y-0.5" : "opacity-70"}>
                <div className="flex items-center gap-4">
                  <span className="text-[48px] leading-none" aria-hidden>
                    {g.icon}
                  </span>
                  <div>
                    <p className="font-title text-heading">{g.title}</p>
                    <p className="font-pixel text-small text-text-muted">{g.desc}</p>
                    {!g.ready && <p className="mt-1 font-pixel text-small font-bold text-navy-700">곧 열려요!</p>}
                  </div>
                </div>
              </RetroWindow>
            );
            return g.ready ? (
              <Link key={g.title} href={g.href}>
                {body}
              </Link>
            ) : (
              <div key={g.title}>{body}</div>
            );
          })}
        </div>
      </main>
    </DesktopBackground>
  );
}
