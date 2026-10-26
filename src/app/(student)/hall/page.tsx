import { connection } from "next/server";
import { Suspense } from "react";
import { DesktopBackground } from "@/components/ui/DesktopBackground";
import { Loading } from "@/components/ui/Loading";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { requireStudent } from "@/lib/auth/viewer";
import { loadMyHall, type HallBoard } from "@/lib/hall/server";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Board({ board }: { board: HallBoard }) {
  return (
    <RetroWindow title={board.title}>
      <p className="mb-2 font-pixel text-small text-text-muted">{board.note}</p>
      {board.entries.length === 0 ? (
        <p className="font-pixel text-body">아직 기록이 없어요. 첫 번째 주인공이 되어 봐요!</p>
      ) : (
        <ol className="flex flex-col font-pixel text-body text-navy-900">
          {board.entries.map((e, i) => (
            <li
              key={e.studentId}
              className={`flex items-center gap-2 border-b border-win-shadow px-1 py-1 ${e.me ? "font-bold" : ""}`}
              style={e.me ? { background: "#fff6d6" } : undefined}
            >
              <span className="w-8 shrink-0 text-center">{MEDAL[i + 1] ?? `${i + 1}`}</span>
              <span className="min-w-0 flex-1 truncate">
                {e.nickname} <span className="text-small text-text-muted">{e.classNo}반</span>
                {e.me && <span className="ml-1 text-small">(나)</span>}
              </span>
              {e.tier && <TierBadge tier={e.tier} />}
              <span className="shrink-0 text-right">{e.value}</span>
            </li>
          ))}
        </ol>
      )}
    </RetroWindow>
  );
}

async function Content() {
  await connection();
  const v = await requireStudent();
  const hall = await loadMyHall(v.userId, v.enrollment?.classId ?? null);
  if (!hall) {
    return (
      <RetroWindow title="명예의 전당">
        <p className="font-pixel text-body">반에 들어가 있는 학생만 볼 수 있어요.</p>
      </RetroWindow>
    );
  }
  return (
    <>
      <p className="mb-5 text-center font-pixel text-body text-navy-900">
        {hall.grade}학년 전체에서 부문별 최고 기록 TOP 10이에요. 닉네임만 보여요.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        {hall.boards.map((b) => (
          <Board key={b.id} board={b} />
        ))}
      </div>
    </>
  );
}

export default function HallPage() {
  return (
    <DesktopBackground>
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <h1 className="title-lime mb-2 text-center text-title">명예의 전당</h1>
        <Suspense fallback={<Loading />}>
          <Content />
        </Suspense>
      </main>
    </DesktopBackground>
  );
}
