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
              {/* 닉네임이 잘리지 않게: 윗줄 닉네임, 아랫줄 티어·기록 */}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="break-all">
                  {e.nickname} <span className="text-small text-text-muted">{e.classNo}반</span>
                  {e.me && <span className="ml-1 text-small">(나)</span>}
                </span>
                <span className="flex flex-wrap items-center gap-1 text-small">
                  {e.tier && <TierBadge tier={e.tier} />}
                  <span>{e.value}</span>
                </span>
              </span>
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
  const hall = await loadMyHall(v.userId, v.enrollment);
  if (!hall) {
    return (
      <RetroWindow title="명예의 전당">
        <p className="font-pixel text-body">반에 들어가 있는 학생만 볼 수 있어요.</p>
      </RetroWindow>
    );
  }
  return (
    <>
      <p className="mb-2 text-center">
        <span className="inline-block border-3 border-navy-900 bg-yellow-400 px-4 py-1 font-title text-heading text-navy-900 shadow-pixel-md">
          시즌 {hall.season.n} · {hall.season.daysLeft}일 남음
        </span>
      </p>
      <p className="mb-5 text-center font-pixel text-body text-navy-900">
        {hall.grade}학년 전체에서 부문별 TOP 10이에요. 닉네임만 보여요. 성장왕은 시즌(2주)마다 새로 시작해요!
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
