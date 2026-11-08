import { connection } from "next/server";
import { Suspense } from "react";
import { AppBar } from "@/components/ui/AppBar";
import { BgmPlayer } from "@/components/ui/BgmPlayer";
import { Loading } from "@/components/ui/Loading";
import { requireStudent } from "@/lib/auth/viewer";
import { loadPracticeData } from "@/lib/practice/server";
import { PracticeDataProvider } from "@/lib/practice/store";
import { isMobileRequest } from "@/lib/device.server";
import { PcOnlyGuard, PcOnlyNotice } from "@/components/ui/PcOnly";

/** 학생 화면: 로그인 + 반 + 닉네임이 있어야 들어올 수 있음. 내 기록을 서버에서 읽어 화면에 넘김 */
async function StudentGate({ children }: { children: React.ReactNode }) {
  await connection(); // 로그인·날짜는 요청마다 새로 확인
  const v = await requireStudent();
  // 학생은 휴대폰·태블릿으로 못 들어와요 (타자 연습은 컴퓨터에서만, 교사 결정 2026-11-09)
  if (v.role !== "teacher" && (await isMobileRequest())) return <PcOnlyNotice />;
  const data = await loadPracticeData(v.userId);
  return (
    <PracticeDataProvider initial={data}>
      <BgmPlayer />
      <AppBar nickname={v.nickname ?? (v.role === "teacher" ? "선생님" : "")} isTeacher={v.role === "teacher"} />
      <PcOnlyGuard isTeacher={v.role === "teacher"}>{children}</PcOnlyGuard>
    </PracticeDataProvider>
  );
}

export default function StudentLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Loading />}>
      <StudentGate>{children}</StudentGate>
    </Suspense>
  );
}
