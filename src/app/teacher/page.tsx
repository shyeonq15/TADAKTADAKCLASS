import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BattleBoard } from "@/components/battle/BattleBoard";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { schoolYearOf } from "@/lib/auth/config";
import { requireTeacher } from "@/lib/auth/viewer";
import { loadBattle } from "@/lib/battle/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateClassForm } from "./CreateClassForm";

async function Classes({ searchParams }: { searchParams: PageProps<"/teacher">["searchParams"] }) {
  await connection(); // 로그인·날짜는 요청마다 새로 확인
  const t = await requireTeacher();
  const current = schoolYearOf();
  // 지난 학년도 반도 볼 수 있게 (?year=2026)
  const { data: years } = await createAdminClient().from("school_years").select("year").eq("school_id", t.schoolId).order("year", { ascending: false });
  const yearList = [...new Set([current, ...(years ?? []).map((y) => y.year)])].sort((a, b) => b - a);
  const asked = Number((await searchParams).year);
  const year = yearList.includes(asked) ? asked : current;
  const isCurrent = year === current;
  const { data: classes } = await createAdminClient()
    .from("classes")
    .select("id, school_year_id, grade, class_no, join_code, coins, enrollments(count), school_years!inner(year, school_id)")
    .eq("school_years.school_id", t.schoolId)
    .eq("school_years.year", year)
    .order("grade")
    .order("class_no");

  // 학년마다 반 대결 순위판
  const grades = [...new Map((classes ?? []).map((c) => [c.grade, c.school_year_id])).entries()];
  const battles = isCurrent ? await Promise.all(grades.map(([grade, schoolYearId]) => loadBattle({ schoolYearId, grade }))) : [];

  return (
    <div className="flex flex-col gap-6">
      {yearList.length > 1 && (
        <nav aria-label="학년도" className="flex flex-wrap items-center gap-1">
          {yearList.map((y) => (
            <Link
              key={y}
              href={y === current ? "/teacher" : `/teacher?year=${y}`}
              aria-current={y === year ? "page" : undefined}
              className={`flex h-9 items-center px-4 ${y === year ? "win-bevel-pressed bg-paper font-bold" : "win-bevel"}`}
            >
              {y}학년도{y === current ? " (지금)" : ""}
            </Link>
          ))}
        </nav>
      )}
      {!isCurrent && (
        <p className="border-2 border-navy-900 bg-paper px-3 py-2">
          지난 학년도 반이에요. 반 관리에서 학생들을 {current}학년도 반으로 <strong>진급</strong>시킬 수 있어요. 기록은 학생에게 그대로 남아요.
        </p>
      )}
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

      {battles.map((b) => (
        <RetroWindow key={b.grade} title={`${b.grade}학년 반 대결 순위판`}>
          <BattleBoard data={b} />
        </RetroWindow>
      ))}

      {isCurrent && (
        <RetroWindow title={`새 반 만들기 (${current}학년도)`}>
          <CreateClassForm />
        </RetroWindow>
      )}

      <p className="text-small text-paper">
        {t.realName ?? t.email} 선생님으로 로그인했어요.
      </p>
    </div>
  );
}

export default function TeacherHome({ searchParams }: PageProps<"/teacher">) {
  return (
    <Suspense fallback={<Loading />}>
      <Classes searchParams={searchParams} />
    </Suspense>
  );
}
