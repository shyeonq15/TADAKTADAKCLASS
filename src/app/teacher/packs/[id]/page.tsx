import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { TRACK_LABELS, type Track } from "@/config/game";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { schoolYearOf } from "@/lib/auth/config";
import { requireTeacher } from "@/lib/auth/viewer";
import { dayKeyKST } from "@/lib/practice/day";
import { createAdminClient } from "@/lib/supabase/admin";
import { setAssignment } from "../actions";
import { DeletePackButton } from "./DeletePackButton";

function AssignButton({ packId, classId, action, label, primary }: { packId: string; classId: string; action: string; label: string; primary?: boolean }) {
  return (
    <form action={setAssignment}>
      <input type="hidden" name="packId" value={packId} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="action" value={action} />
      <button className={`win-bevel h-8 px-3 text-small active:win-bevel-pressed ${primary ? "bg-lime-400 font-bold" : ""}`}>{label}</button>
    </form>
  );
}

async function PackDetail({ params }: { params: PageProps<"/teacher/packs/[id]">["params"] }) {
  const { id } = await params;
  const t = await requireTeacher();
  await connection();
  const admin = createAdminClient();

  const { data: pack } = await admin
    .from("packs")
    .select("id, title, track, passages(id, body, sort), pack_assignments(class_id, mission_day)")
    .eq("id", id)
    .eq("school_id", t.schoolId)
    .maybeSingle();
  if (!pack) notFound();

  const { data: classes } = await admin
    .from("classes")
    .select("id, grade, class_no, school_years!inner(year, school_id)")
    .eq("school_years.school_id", t.schoolId)
    .eq("school_years.year", schoolYearOf())
    .order("grade")
    .order("class_no");

  const today = dayKeyKST();
  const assigned = new Map((pack.pack_assignments as { class_id: string; mission_day: string | null }[]).map((a) => [a.class_id, a]));
  const passages = [...(pack.passages as { id: string; body: string; sort: number }[])].sort((a, b) => a.sort - b.sort);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-title text-title text-paper">
        {pack.title} <span className="text-heading">· {TRACK_LABELS[pack.track as Track]}</span>
      </h1>

      <RetroWindow title="반에 배포하기">
        <p className="mb-3 text-small text-text-muted">
          배포하면 그 반 학생의 연습 트랙에 &ldquo;선생님 연습&rdquo;으로 나와요. 오늘의 미션으로 지정하면 오늘 그 반 미션이 이 연습팩으로 바뀌어요.
        </p>
        {classes && classes.length ? (
          <table className="w-full text-body">
            <tbody>
              {classes.map((c) => {
                const a = assigned.get(c.id);
                const mission = a?.mission_day === today;
                return (
                  <tr key={c.id} className="border-b border-win-shadow">
                    <td className="py-2 font-bold">
                      {c.grade}학년 {c.class_no}반
                    </td>
                    <td className="py-2">{a ? (mission ? "✅ 배포 · 오늘의 미션" : "✅ 배포됨") : "—"}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-2">
                        {!a && <AssignButton packId={pack.id} classId={c.id} action="assign" label="배포" primary />}
                        {a && !mission && <AssignButton packId={pack.id} classId={c.id} action="mission" label="오늘의 미션으로" primary />}
                        {mission && <AssignButton packId={pack.id} classId={c.id} action="unmission" label="미션 해제" />}
                        {a && <AssignButton packId={pack.id} classId={c.id} action="remove" label="배포 취소" />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>먼저 반 관리에서 반을 만들어 주세요.</p>
        )}
      </RetroWindow>

      <RetroWindow title={`지문 ${passages.length}판`}>
        <div className="grid max-h-[480px] gap-2 overflow-y-auto md:grid-cols-2">
          {passages.map((p, i) => (
            <div key={p.id} className="border-3 border-navy-900 bg-surface px-3 py-2">
              <p className="text-small text-text-muted">{i + 1}판</p>
              <pre className="whitespace-pre-wrap font-typing text-small">{p.body}</pre>
            </div>
          ))}
        </div>
      </RetroWindow>

      <DeletePackButton packId={pack.id} />
    </div>
  );
}

export default function PackPage({ params }: PageProps<"/teacher/packs/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <PackDetail params={params} />
    </Suspense>
  );
}
