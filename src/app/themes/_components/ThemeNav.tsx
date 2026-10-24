import Link from "next/link";

const THEMES = [
  { id: "poster", label: "A 픽셀 포스터" },
  { id: "crt", label: "B CRT 레트로" },
  { id: "desktop", label: "C Y2K 바탕화면" },
  { id: "mix", label: "D 포스터 × 바탕화면" },
] as const;

/** 시안 사이를 오가는 상단 바. 시안 비교용이라 모든 시안에서 같은 모양. */
export function ThemeNav({ current }: { current: (typeof THEMES)[number]["id"] }) {
  return (
    <nav className="relative z-10 flex items-center gap-2 bg-ink px-4 py-2 font-pixel text-small text-paper">
      <Link href="/themes" className="mr-4 underline underline-offset-4">
        시안 목록
      </Link>
      {THEMES.map((t) => (
        <Link
          key={t.id}
          href={`/themes/${t.id}`}
          aria-current={t.id === current ? "page" : undefined}
          className={`px-3 py-1 ${t.id === current ? "bg-lime-400 text-navy-900" : "hover:bg-[#333]"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
