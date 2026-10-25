import { connection } from "next/server";
import { Suspense } from "react";
import { TRACK_LABELS } from "@/config/game";
import { Loading } from "@/components/ui/Loading";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { requireTeacher } from "@/lib/auth/viewer";
import { listBosses } from "@/lib/games/boss";
import { deleteBoss, toggleBoss } from "./actions";

async function Bosses() {
  await connection(); // 로그인은 요청마다 새로 확인
  const t = await requireTeacher();
  const bosses = await listBosses(t.userId, t.schoolId, true);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-title text-title text-paper">보스전 관리</h1>
        <PixelLink href="/teacher/boss/record" variant="success">
          + 보스 기록 만들기
        </PixelLink>
      </div>
      <RetroWindow title="우리 학교 보스">
        <p className="mb-3 text-small text-text-muted">
          선생님이 직접 친 기록이 &ldquo;보스 고스트&rdquo;가 돼요. 학생은 같은 글로 고스트와 레이스해서, 더 빨리 끝내고 정확도 90% 이상이면 보스를 이겨요.
        </p>
        {bosses.length ? (
          <table className="w-full text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left">
                <th className="py-2">이름</th>
                <th className="py-2">트랙</th>
                <th className="py-2 text-right">기록</th>
                <th className="py-2 text-right">시간</th>
                <th className="py-2">상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bosses.map((b) => (
                <tr key={b.id} className="border-b border-win-shadow">
                  <td className="py-2 font-bold">{b.title}</td>
                  <td className="py-2">{TRACK_LABELS[b.track]}</td>
                  <td className="py-2 text-right">
                    {b.cpm}타 · {b.accuracy}%
                  </td>
                  <td className="py-2 text-right">{Math.round(b.durationMs / 1000)}초</td>
                  <td className="py-2">{b.active ? "학생에게 보임" : "숨김"}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      <form action={toggleBoss}>
                        <input type="hidden" name="id" value={b.id} />
                        <input type="hidden" name="active" value={b.active ? "false" : "true"} />
                        <button className="win-bevel h-8 px-3 text-small active:win-bevel-pressed">{b.active ? "숨기기" : "보이기"}</button>
                      </form>
                      <form action={deleteBoss}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="win-bevel h-8 px-3 text-small text-red-500 active:win-bevel-pressed">지우기</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>아직 보스가 없어요. [보스 기록 만들기]로 첫 보스를 만들어 보세요!</p>
        )}
      </RetroWindow>
    </div>
  );
}

export default function TeacherBossPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Bosses />
    </Suspense>
  );
}
