import Link from "next/link";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { RetroWindow } from "@/components/ui/RetroWindow";

const GAMES = [
  { href: "/games/rain", icon: "🌧️", title: "단어 비", desc: "떨어지는 단어를 바닥에 닿기 전에 터뜨려요", ready: true },
  { href: "", icon: "🐰", title: "토끼 달리기", desc: "장애물 단어를 쳐서 점프! 멀리 달려요", ready: false },
  { href: "", icon: "👾", title: "보스전", desc: "선생님 기록(고스트)과 레이스해요", ready: false },
  { href: "", icon: "🏁", title: "친구 대결", desc: "반 친구와 실시간 레이스 (최대 4명)", ready: false },
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
