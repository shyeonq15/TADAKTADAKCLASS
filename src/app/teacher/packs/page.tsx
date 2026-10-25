import Link from "next/link";
import { Suspense } from "react";
import { TRACK_LABELS, type Track } from "@/config/game";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireTeacher } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

async function Packs() {
  const t = await requireTeacher();
  const { data: packs } = await createAdminClient()
    .from("packs")
    .select("id, title, track, created_at, passages(count), pack_assignments(class_id, mission_day)")
    .eq("school_id", t.schoolId)
    .order("created_at", { ascending: false });

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
                    <td className="py-2 font-bold">{p.title}</td>
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
