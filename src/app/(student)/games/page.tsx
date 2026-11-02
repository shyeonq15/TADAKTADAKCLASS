import Link from "next/link";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { RetroWindow } from "@/components/ui/RetroWindow";

type Game = { href: string; icon: string; title: string; desc: string };

/** 게임 목록: 타자 게임 / 정보 실험실(배운 내용 복습) / 함께하기 */
const SECTIONS: { title: string; note: string; games: Game[] }[] = [
  {
    title: "⌨️ 타자 게임",
    note: "혼자, 또는 친구·선생님과 겨뤄요",
    games: [
      { href: "/games/rain", icon: "🌧️", title: "단어 비", desc: "떨어지는 단어를 바닥에 닿기 전에 터뜨려요" },
      { href: "/games/runner", icon: "🐰", title: "토끼 달리기", desc: "장애물 단어를 쳐서 점프! 멀리 달려요" },
      { href: "/games/boss", icon: "👾", title: "보스전", desc: "선생님·친구 기록(고스트)과 레이스해요" },
      { href: "/games/race", icon: "🏁", title: "친구 대결", desc: "반 친구와 실시간 레이스 (최대 4명)" },
    ],
  },
  {
    title: "🔬 정보 실험실",
    note: "수업에서 배운 내용을 쳐 보며 복습해요",
    games: [
      { href: "/binary", icon: "🔢", title: "이진수 연습실", desc: "자릿값 보며 십진수 쓰기 → 비트 눌러 만들기 (6단계)" },
      { href: "/games/bits", icon: "💾", title: "비트 비", desc: "떨어지는 4·5비트 이진수를 십진수로! (연습실 다음에)" },
      { href: "/games/io", icon: "🖨️", title: "입출력 레이스", desc: "입력 장치는 i, 출력 장치는 o!" },
      { href: "/pixel", icon: "🖼️", title: "0과 1 픽셀 아트", desc: "숫자로 그림을 그려 우리 반 갤러리에 걸어요" },
      { href: "/adc", icon: "〰️", title: "아날로그 → 디지털", desc: "소리 곡선을 숫자로 바꿔 듣기 (표본화·양자화)" },
      { href: "/dictation", icon: "🎧", title: "영어 받아쓰기", desc: "문장을 듣고 그대로 쳐요 (영타 + 듣기)" },
    ],
  },
  {
    title: "🤝 함께하기",
    note: "우리 반·우리 학년 모두의 기록",
    games: [
      { href: "/room#raid", icon: "⚔️", title: "협동 레이드", desc: "우리 반 모두의 타수로 이번 주 보스를 쓰러뜨려요" },
      { href: "/hall", icon: "🏆", title: "명예의 전당", desc: "우리 학년 부문별 TOP 10 · 성장왕" },
    ],
  },
];

export default function GamesPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="title-lime mb-6 text-center text-title">게임</h1>
        <div className="flex flex-col gap-8">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-3 flex flex-wrap items-baseline gap-2 border-b-3 border-navy-900 pb-1 font-title text-heading text-navy-900">
                {s.title}
                <span className="font-pixel text-small text-text-muted">{s.note}</span>
              </h2>
              <div className="grid gap-5 md:grid-cols-2">
                {s.games.map((g) => (
                  <Link key={g.title} href={g.href}>
                    <RetroWindow title={`${g.title}.exe`} className="transition-transform hover:-translate-y-0.5">
                      <div className="flex items-center gap-4">
                        <span className="text-[48px] leading-none" aria-hidden>
                          {g.icon}
                        </span>
                        <div>
                          <p className="font-title text-heading">{g.title}</p>
                          <p className="font-pixel text-small text-text-muted">{g.desc}</p>
                        </div>
                      </div>
                    </RetroWindow>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </DesktopBackground>
  );
}
