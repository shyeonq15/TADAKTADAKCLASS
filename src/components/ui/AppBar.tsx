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

/** 윈도우 작업 표시줄 모양의 상단 메뉴 */
export function AppBar({ nickname, isTeacher }: { nickname: string; isTeacher: boolean }) {
  const pathname = usePathname();
  const { progress } = usePracticeData();

  return (
    <nav className="win-bevel relative z-10 flex h-12 items-center gap-1 px-2">
      <Link href="/" className="win-bevel mr-2 flex h-9 items-center gap-2 px-3 font-title text-body text-navy-900">
        ▶ 타닥타닥
      </Link>
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-9 items-center px-4 font-pixel text-body text-navy-900 ${active ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
          >
            {l.label}
          </Link>
        );
      })}
      {isTeacher && (
        <Link href="/teacher" className="win-bevel ml-2 flex h-9 items-center px-4 font-pixel text-body text-navy-900">
          교사 화면
        </Link>
      )}
      <div className="win-bevel-pressed ml-auto flex h-9 items-center gap-2 px-3 font-pixel text-body" title="내 코인">
        <PixelSprite sprite={COIN} scale={2} />
        {progress.coins}
      </div>
      {/* 닉네임을 누르면 내 프로필 */}
      <Link
        href="/profile"
        aria-current={pathname.startsWith("/profile") ? "page" : undefined}
        title="내 프로필"
        className={`flex h-9 items-center px-3 font-pixel text-body text-navy-900 ${pathname.startsWith("/profile") ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
      >
        {nickname}
      </Link>
      {/* 건의함: 지금 보던 화면 주소를 같이 넘겨서 버그 찾기 쉽게 */}
      <Link
        href={`/feedback?from=${encodeURIComponent(pathname)}`}
        title="건의함 (버그 제보·아이디어)"
        aria-label="건의함"
        className={`flex h-9 items-center px-2 text-body ${pathname.startsWith("/feedback") ? "win-bevel-pressed bg-paper" : "win-bevel"}`}
      >
        📮
      </Link>
      <form action={signOut}>
        <button className="win-bevel h-9 px-3 font-pixel text-small text-navy-900 active:win-bevel-pressed">로그아웃</button>
      </form>
    </nav>
  );
}
