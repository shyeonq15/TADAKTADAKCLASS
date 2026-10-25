import Link from "next/link";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { schoolYearOf } from "@/lib/auth/config";
import { requireTeacher } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateClassForm } from "./CreateClassForm";

async function Classes() {
  const t = await requireTeacher();
  const year = schoolYearOf();
  const { data: classes } = await createAdminClient()
    .from("classes")
    .select("id, grade, class_no, join_code, coins, enrollments(count), school_years!inner(year, school_id)")
    .eq("school_years.school_id", t.schoolId)
    .eq("school_years.year", year)
    .order("grade")
    .order("class_no");

  return (
    <div className="flex flex-col gap-6">
      <RetroWindow title={`${year}학년도 반 목록`}>
        {classes && classes.length > 0 ? (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left">
                <th className="py-2">반</th>
                <th className="py-2">반 코드</th>
                <th className="py-2 text-right">학생 수</th>
                <th className="py-2 text-right">반 지갑</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-b border-win-shadow">
                  <td className="py-2 font-bold">
                    {c.grade}학년 {c.class_no}반
                  </td>
                  <td className="py-2 font-typing text-heading tracking-widest">{c.join_code}</td>
                  <td className="py-2 text-right">{(c.enrollments as unknown as { count: number }[])[0]?.count ?? 0}명</td>
                  <td className="py-2 text-right">{c.coins}</td>
                  <td className="py-2 text-right">
                    <Link href={`/teacher/classes/${c.id}`} className="underline underline-offset-4">
                      관리 ▶
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>아직 반이 없어요. 아래에서 반을 만들어 주세요.</p>
        )}
      </RetroWindow>

      <RetroWindow title="새 반 만들기">
        <CreateClassForm />
      </RetroWindow>

      <p className="text-small text-paper">
        {t.realName ?? t.email} 선생님으로 로그인했어요.
      </p>
    </div>
  );
}

export default function TeacherHome() {
  return (
    <Suspense fallback={<Loading />}>
      <Classes />
    </Suspense>
  );
}
