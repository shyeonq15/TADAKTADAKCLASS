"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { COIN } from "@/components/pixel/sprites";
import { signOut } from "@/app/login/actions";
import { usePracticeData } from "@/lib/practice/store";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/practice", label: "연습 트랙" },
  { href: "/mission", label: "오늘의 미션" },
  { href: "/learn", label: "파이썬 첫걸음" },
  { href: "/explore", label: "교과 탐험" },
  { href: "/games", label: "게임" },
  { href: "/room", label: "우리 반" },
  { href: "/shop", label: "상점" },
  { href: "/help", label: "도움말" },
] as const;

/**
 * 윈도우 작업 표시줄 모양의 상단 메뉴.
 * 넓은 화면은 한 줄, 좁은 화면(휴대폰·세로 태블릿)은 두 줄: 위는 내 정보, 아래는 옆으로 밀어 보는 메뉴.
 * 메뉴가 화면보다 길어도 페이지 전체가 넓어지지 않게 메뉴 칸 안에서만 옆으로 밀려요
 */
export function AppBar({ nickname, isTeacher }: { nickname: string; isTeacher: boolean }) {
  const pathname = usePathname();
  const { progress } = usePracticeData();

  return (
    <nav className="win-bevel relative z-10 flex flex-wrap items-center gap-1 px-2 py-1.5 lg:h-12 lg:flex-nowrap lg:py-0">
      <Link href="/" className="win-bevel mr-2 flex h-9 shrink-0 items-center gap-2 px-3 font-title text-body text-navy-900 max-sm:hidden">
        ▶ 타닥타닥
      </Link>
      <div className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:thin] max-lg:order-last max-lg:w-full">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 shrink-0 items-center whitespace-nowrap px-4 font-pixel text-body text-navy-900 max-lg:px-3 ${active ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
          >
            {l.label}
          </Link>
        );
      })}
      {isTeacher && (
        <Link href="/teacher" className="win-bevel ml-2 flex h-9 shrink-0 items-center whitespace-nowrap px-4 font-pixel text-body text-navy-900">
          교사 화면
        </Link>
      )}
      </div>
      <div className="win-bevel-pressed flex h-9 shrink-0 sm:ml-auto items-center gap-2 px-3 font-pixel text-body" title="내 코인">
        <PixelSprite sprite={COIN} scale={2} />
        {progress.coins}
      </div>
      {/* 닉네임을 누르면 내 프로필 */}
      <Link
        href="/profile"
        aria-current={pathname.startsWith("/profile") ? "page" : undefined}
        title="내 프로필"
        className={`flex h-9 min-w-0 max-w-24 items-center truncate sm:max-w-32 px-3 font-pixel text-body text-navy-900 lg:max-w-none ${pathname.startsWith("/profile") ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
      >
        {nickname}
      </Link>
      {/* 건의함: 지금 보던 화면 주소를 같이 넘겨서 버그 찾기 쉽게 */}
      <Link
        href={`/feedback?from=${encodeURIComponent(pathname)}`}
        title="건의함 (버그 제보·아이디어)"
        aria-label="건의함"
        className={`flex h-9 shrink-0 items-center px-2 text-body ${pathname.startsWith("/feedback") ? "win-bevel-pressed bg-paper" : "win-bevel"}`}
      >
        📮
      </Link>
      <Link
        href="/settings"
        title="설정 (디지털 눈·효과음·배경음악)"
        aria-label="설정"
        className={`flex h-9 shrink-0 items-center px-2 text-body ${pathname.startsWith("/settings") ? "win-bevel-pressed bg-paper" : "win-bevel"}`}
      >
        ⚙️
      </Link>
      <form action={signOut} className="shrink-0">
        <button className="win-bevel h-9 whitespace-nowrap px-3 font-pixel text-small text-navy-900 active:win-bevel-pressed">로그아웃</button>
      </form>
    </nav>
  );
}
