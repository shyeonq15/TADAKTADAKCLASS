"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { COIN } from "@/components/pixel/sprites";
import { usePracticeData } from "@/lib/practice/store";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/practice", label: "연습 트랙" },
  { href: "/mission", label: "오늘의 미션" },
  { href: "/placement", label: "배치 테스트" },
] as const;

/** 윈도우 작업 표시줄 모양의 상단 메뉴 */
export function AppBar() {
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
      <div className="win-bevel-pressed ml-auto flex h-9 items-center gap-2 px-3 font-pixel text-body" title="내 코인 (미리보기)">
        <PixelSprite sprite={COIN} scale={2} />
        {progress.coins}
      </div>
    </nav>
  );
}
