import { connection } from "next/server";
import { subjectOf } from "@/config/subjects";
import Link from "next/link";
import { Suspense } from "react";
import { TRACK_LABELS, type Track } from "@/config/game";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireTeacher } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

async function Packs() {
  await connection(); // 로그인은 요청마다 새로 확인
  const t = await requireTeacher();
  const admin = createAdminClient();
  const cols = "id, title, track, created_at, passages(count), pack_assignments(class_id, mission_day)";
  const query = (c: string) => admin.from("packs").select(c).eq("school_id", t.schoolId).order("created_at", { ascending: false });
  // 교과 탐험 칸(과목·단원·학년)이 아직 없으면(SQL 전) 빼고 읽어요
  let res = await query(`${cols}, subject, unit_no, grade`);
  if (res.error) res = await query(cols);
  type PackRow = {
    id: string;
    title: string;
    track: string;
    created_at: string;
    passages: { count: number }[];
    pack_assignments: { class_id: string; mission_day: string | null }[];
    subject?: string | null;
    unit_no?: number | null;
    grade?: number | null;
  };
  const packs = (res.data ?? []) as unknown as PackRow[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-title text-title text-paper">선생님 연습팩</h1>
        <PixelLink href="/teacher/packs/new" variant="success">
          + 새 연습팩
        </PixelLink>
      </div>
      <RetroWindow title="연습팩 목록 (우리 학교)">
        {packs && packs.length ? (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left">
                <th className="py-2">이름</th>
                <th className="py-2">트랙</th>
                <th className="py-2 text-right">판 수</th>
                <th className="py-2 text-right">배포한 반</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {packs.map((p) => {
                const assigned = p.pack_assignments as unknown as { class_id: string }[];
                return (
                  <tr key={p.id} className="border-b border-win-shadow">
                    <td className="py-2 font-bold">
                      {p.title}
                      {subjectOf(p.subject) && (
                        <span className="ml-2 border-2 border-navy-900 bg-yellow-400 px-1 text-small font-normal">
                          🧭 {subjectOf(p.subject)!.label} {p.unit_no ? `${p.unit_no}단원` : ""} {p.grade ? `${p.grade}학년` : "모든 학년"}
                        </span>
                      )}
                    </td>
                    <td className="py-2">{TRACK_LABELS[p.track as Track]}</td>
                    <td className="py-2 text-right">{(p.passages as unknown as { count: number }[])[0]?.count ?? 0}판</td>
                    <td className="py-2 text-right">{assigned.length}개 반</td>
                    <td className="py-2 text-right">
                      <Link href={`/teacher/packs/${p.id}`} className="underline underline-offset-4">
                        보기·배포 ▶
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p>아직 연습팩이 없어요. 교과서나 수업 자료에서 고른 글을 붙여 넣어 만들어 보세요.</p>
        )}
      </RetroWindow>
    </div>
  );
}

export default function PacksPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Packs />
    </Suspense>
  );
}
