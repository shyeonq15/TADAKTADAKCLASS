import Link from "next/link";
import { signOut } from "@/app/login/actions";

export default function TeacherLayout({ children }: LayoutProps<"/teacher">) {
  return (
    <div className="flex flex-1 flex-col bg-[#3a6ea5]">
      <nav className="win-bevel flex h-12 items-center gap-1 px-2">
        <Link href="/teacher" className="win-bevel flex h-9 items-center px-3 font-title text-body text-navy-900">
          ▶ 교사 화면
        </Link>
        <Link href="/teacher" className="win-bevel flex h-9 items-center px-4 font-pixel text-body text-navy-900">
          반 관리
        </Link>
        <Link href="/teacher/packs" className="win-bevel flex h-9 items-center px-4 font-pixel text-body text-navy-900">
          연습팩
        </Link>
        <Link href="/" className="win-bevel flex h-9 items-center px-4 font-pixel text-body text-navy-900">
          학생 화면 보기
        </Link>
        <form action={signOut} className="ml-auto">
          <button className="win-bevel h-9 px-4 font-pixel text-body text-navy-900 active:win-bevel-pressed">로그아웃</button>
        </form>
      </nav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 font-sans">{children}</main>
    </div>
  );
}
