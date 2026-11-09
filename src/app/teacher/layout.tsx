import Link from "next/link";
import { signOut } from "@/app/login/actions";

export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <div className="flex flex-1 flex-col bg-[#3a6ea5]">
      {/* 넓은 화면은 한 줄, 좁은 화면은 두 줄 (아래 줄 메뉴는 옆으로 밀어 봐요) */}
      <nav className="win-bevel flex flex-wrap items-center gap-1 px-2 py-1.5 lg:h-12 lg:flex-nowrap lg:py-0">
        <Link href="/teacher" className="win-bevel flex h-9 shrink-0 items-center whitespace-nowrap px-3 font-title text-body text-navy-900">
          ▶ 교사 화면
        </Link>
        <div className="flex min-w-0 gap-1 overflow-x-auto [scrollbar-width:thin] max-lg:order-last max-lg:w-full">
        <Link href="/teacher" className="win-bevel flex h-9 shrink-0 items-center whitespace-nowrap px-4 font-pixel text-body text-navy-900 max-lg:px-3">
          반 관리
        </Link>
        <Link href="/teacher/packs" className="win-bevel flex h-9 shrink-0 items-center whitespace-nowrap px-4 font-pixel text-body text-navy-900 max-lg:px-3">
          연습팩
        </Link>
        <Link href="/teacher/boss" className="win-bevel flex h-9 shrink-0 items-center whitespace-nowrap px-4 font-pixel text-body text-navy-900 max-lg:px-3">
          보스전
        </Link>
        <Link href="/teacher/feedback" className="win-bevel flex h-9 shrink-0 items-center whitespace-nowrap px-4 font-pixel text-body text-navy-900 max-lg:px-3">
          건의함
        </Link>
        <Link href="/" className="win-bevel flex h-9 shrink-0 items-center whitespace-nowrap px-4 font-pixel text-body text-navy-900 max-lg:px-3">
          학생 화면 보기
        </Link>
        </div>
        <form action={signOut} className="ml-auto shrink-0">
          <button className="win-bevel h-9 whitespace-nowrap px-4 font-pixel text-body text-navy-900 active:win-bevel-pressed">로그아웃</button>
        </form>
      </nav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 font-sans max-sm:px-3 max-sm:py-4">{children}</main>
    </div>
  );
}
