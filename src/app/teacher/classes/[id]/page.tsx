import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { dayKeyKST } from "@/lib/practice/day";
import { requireTeacher } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { AddStudentsForm, ResetPinButton } from "./RosterForms";

async function ClassDetail({ params }: { params: PageProps<"/teacher/classes/[id]">["params"] }) {
  const { id } = await params;
  const t = await requireTeacher();
  const admin = createAdminClient();

  const { data: cls } = await admin
    .from("classes")
    .select("id, grade, class_no, join_code, coins, school_years!inner(year, school_id)")
    .eq("id", id)
    .eq("school_years.school_id", t.schoolId)
    .maybeSingle();
  if (!cls) notFound();

  const today = dayKeyKST();
  const [{ data: roster }, { data: done }] = await Promise.all([
    admin
      .from("enrollments")
      .select("number, student_id, profiles!inner(real_name, nickname, login_method)")
      .eq("class_id", id)
      .order("number"),
    admin.from("mission_completions").select("student_id").eq("class_id", id).eq("day", today),
  ]);
  const doneSet = new Set((done ?? []).map((d) => d.student_id));
  const students = (roster ?? []).map((r) => ({
    number: r.number,
    studentId: r.student_id,
    ...(r.profiles as unknown as { real_name: string | null; nickname: string | null; login_method: "google" | "pin" }),
  }));

  return (
    <div className="flex flex-col gap-6">
      <RetroWindow title={`${cls.grade}학년 ${cls.class_no}반`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-small text-text-muted">반 코드 (학생에게 알려 주세요)</p>
            <p className="font-typing text-[48px] leading-none tracking-[0.2em] text-navy-900">{cls.join_code}</p>
          </div>
          <div className="text-right">
            <p className="text-small text-text-muted">오늘 미션 완료</p>
            <p className="font-title text-stat">
              {doneSet.size} / {students.length}명
            </p>
          </div>
        </div>
      </RetroWindow>

      <RetroWindow title="학생 명단 (실명은 교사 화면에서만 보여요)">
        {students.length ? (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left">
                <th className="py-2">번호</th>
                <th className="py-2">이름</th>
                <th className="py-2">닉네임</th>
                <th className="py-2">로그인</th>
                <th className="py-2">오늘 미션</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId} className="border-b border-win-shadow">
                  <td className="py-2">{s.number}</td>
                  <td className="py-2">{s.real_name ?? "-"}</td>
                  <td className="py-2">{s.nickname ?? <span className="text-text-muted">아직 안 정함</span>}</td>
                  <td className="py-2">{s.login_method === "pin" ? "PIN" : "구글"}</td>
                  <td className="py-2">{doneSet.has(s.studentId) ? "✅ 완료" : "—"}</td>
                  <td className="py-2 text-right">
                    {s.login_method === "pin" && <ResetPinButton classId={id} studentId={s.studentId} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>아직 학생이 없어요. 구글 로그인 학생은 반 코드로 직접 들어오고, PIN 학생은 아래에서 등록해요.</p>
        )}
      </RetroWindow>

      <RetroWindow title="PIN 로그인 학생 등록">
        <AddStudentsForm classId={id} />
      </RetroWindow>
    </div>
  );
}

export default function ClassPage({ params }: PageProps<"/teacher/classes/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ClassDetail params={params} />
    </Suspense>
  );
}
