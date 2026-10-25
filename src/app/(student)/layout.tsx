import { Suspense } from "react";
import { AppBar } from "@/components/ui/AppBar";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";

/** 학생 화면: 로그인 + 반 + 닉네임이 있어야 들어올 수 있음 */
async function StudentGate({ children }: { children: React.ReactNode }) {
  const v = await requireStudent();
  return (
    <>
      <AppBar nickname={v.nickname ?? (v.role === "teacher" ? "선생님" : "")} isTeacher={v.role === "teacher"} />
      {children}
    </>
  );
}

export default function StudentLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Loading />}>
      <StudentGate>{children}</StudentGate>
    </Suspense>
  );
}
