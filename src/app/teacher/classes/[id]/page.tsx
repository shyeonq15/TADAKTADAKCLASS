import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { dayKeyKST } from "@/lib/practice/day";
import { requireTeacher } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { toggleSecretSetup } from "../../actions";
import { AddStudentsForm, ResetSecretButton } from "./RosterForms";

async function ClassDetail({ params }: { params: PageProps<"/teacher/classes/[id]">["params"] }) {
  const { id } = await params;
  const t = await requireTeacher();
  const admin = createAdminClient();

  const { data: cls } = await admin
    .from("classes")
    .select("id, grade, class_no, join_code, coins, allow_secret_setup, school_years!inner(year, school_id)")
    .eq("id", id)
    .eq("school_years.school_id", t.schoolId)
    .maybeSingle();
  if (!cls) notFound();

  await connection(); // 오늘 날짜는 요청마다 새로 계산
  const today = dayKeyKST();
  const [{ data: roster }, { data: done }] = await Promise.all([
    admin
      .from("enrollments")
      .select("number, student_id, profiles!inner(real_name, nickname, login_method, secret_set)")
      .eq("class_id", id)
      .order("number"),
    admin.from("mission_completions").select("student_id").eq("class_id", id).eq("day", today),
  ]);
  const doneSet = new Set((done ?? []).map((d) => d.student_id));

  // 배치 테스트 결과 (트랙별 타수)
  const ids = (roster ?? []).map((r) => r.student_id);
  const { data: tp } = ids.length
    ? await admin.from("track_progress").select("student_id, track, placement_cpm").in("student_id", ids)
    : { data: [] };
  const placement = new Map<string, Partial<Record<Track, number>>>();
  for (const r of tp ?? []) {
    if (r.placement_cpm === null) continue;
    placement.set(r.student_id, { ...placement.get(r.student_id), [r.track]: r.placement_cpm });
  }
  const avg = (t: Track) => {
    const v = [...placement.values()].map((p) => p[t]).filter((n): n is number => n !== undefined);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const students = (roster ?? []).map((r) => ({
    number: r.number,
    studentId: r.student_id,
    ...(r.profiles as unknown as { real_name: string | null; nickname: string | null; login_method: "google" | "pin"; secret_set: boolean }),
  }));

  return (
    <div className="flex flex-col gap-6">
      <RetroWindow title={`${cls.grade}학년 ${cls.class_no}반`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-small text-text-muted">학생 로그인</p>
            <p className="text-heading">
              학번 <strong className="font-typing">{cls.grade}{String(cls.class_no).padStart(2, "0")}○○</strong> + 그림 비밀번호
            </p>
            <p className="text-small text-text-muted">
              예: 7번 → <span className="font-typing">{cls.grade}{String(cls.class_no).padStart(2, "0")}07</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-small text-text-muted">오늘 미션 완료</p>
            <p className="font-title text-stat">
              {doneSet.size} / {students.length}명
            </p>
          </div>
        </div>
        <form action={toggleSecretSetup} className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-win-shadow pt-4">
          <input type="hidden" name="classId" value={cls.id} />
          <input type="hidden" name="open" value={cls.allow_secret_setup ? "false" : "true"} />
          <span className={`px-3 py-1 font-bold ${cls.allow_secret_setup ? "bg-lime-400 text-navy-900" : "bg-win-shadow text-paper"}`}>
            처음 비밀번호 정하기: {cls.allow_secret_setup ? "켜짐" : "꺼짐"}
          </span>
          <button className="win-bevel h-9 px-4 active:win-bevel-pressed">{cls.allow_secret_setup ? "끄기" : "켜기"}</button>
          <span className="text-small text-text-muted">
            첫 수업에 켜고, 모두 정하면 꺼 주세요. 켜져 있는 동안은 아직 안 정한 학번으로 누구나 비밀번호를 정할 수 있어요.
          </span>
        </form>
      </RetroWindow>

      <RetroWindow title="학생 명단 (실명은 교사 화면에서만 보여요)">
        {students.length ? (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left">
                <th className="py-2">번호</th>
                <th className="py-2">이름</th>
                <th className="py-2">닉네임</th>
                <th className="py-2">학번</th>
                <th className="py-2">비밀번호</th>
                <th className="py-2">오늘 미션</th>
                <th className="py-2 text-right">배치 (한·영·기·코)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentId} className="border-b border-win-shadow">
                  <td className="py-2">{s.number}</td>
                  <td className="py-2">{s.real_name ?? "-"}</td>
                  <td className="py-2">{s.nickname ?? <span className="text-text-muted">아직 안 정함</span>}</td>
                  <td className="py-2 font-typing">{`${cls.grade}${String(cls.class_no).padStart(2, "0")}${String(s.number).padStart(2, "0")}`}</td>
                  <td className="py-2">{s.secret_set ? "정함" : <span className="text-red-500">아직</span>}</td>
                  <td className="py-2">{doneSet.has(s.studentId) ? "✅ 완료" : "—"}</td>
                  <td className="py-2 text-right text-small">
                    {placement.has(s.studentId) ? TRACKS.map((t) => placement.get(s.studentId)?.[t] ?? "-").join(" · ") : <span className="text-text-muted">아직</span>}
                  </td>
                  <td className="py-2 text-right">
                    {s.login_method === "pin" && s.secret_set && <ResetSecretButton classId={id} studentId={s.studentId} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>아직 학생이 없어요. 아래에서 명단을 등록해 주세요.</p>
        )}
      </RetroWindow>

      <RetroWindow title="배치 테스트 반 평균 (타/분)">
        <div className="flex gap-2">
          {TRACKS.map((t) => (
            <div key={t} className="win-bevel-pressed flex-1 bg-paper px-3 py-2">
              <p className="text-small text-text-muted">{TRACK_LABELS[t]}</p>
              <p className="font-title text-stat">{avg(t) ?? "-"}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-small text-text-muted">
          {placement.size}명이 배치 테스트를 했어요. 2주 뒤 티어 기준을 조정할 때 참고해요.
        </p>
      </RetroWindow>

      <RetroWindow title="학생 명단 등록">
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
