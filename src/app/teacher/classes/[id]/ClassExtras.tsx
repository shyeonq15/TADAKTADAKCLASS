import { connection } from "next/server";
import { ClassRoom } from "@/components/room/ClassRoom";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { GAME_LABELS, TEACHER_VIEW, TRACK_LABELS, type SoloGame, type Track } from "@/config/game";
import { KeyHeatmap, keyOf } from "@/components/typing/KeyHeatmap";
import { roomItem } from "@/config/shop";
import { loadRoom } from "@/lib/room/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { closeRoomProposal, removeRoomItem, reviewAttempt } from "../../actions";

const FLAG_LABELS: Record<string, string> = {
  "too-fast": "사람이 치기 어려운 속도",
  "too-regular": "키 누르는 간격이 너무 일정함",
};

const KIND_LABELS: Record<string, string> = {
  practice: "연습",
  mission: "오늘의 미션",
  weak: "맞춤 연습",
  game: "게임",
  boss: "보스전",
  race: "친구 대결",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 확인이 필요한 기록 (CLAUDE.md 6장: 의심 기록은 점수에 바로 넣지 않고 교사 확인으로) */
export async function PendingRecords({ classId, names }: { classId: string; names: Map<string, string> }) {
  const { data } = await createAdminClient()
    .from("attempts")
    .select("id, student_id, kind, mode, track, cpm, accuracy, flags, created_at")
    .eq("class_id", classId)
    .eq("review_status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = data ?? [];

  return (
    <RetroWindow title={`확인이 필요한 기록 (${rows.length})`}>
      {rows.length === 0 ? (
        <p>확인할 기록이 없어요. 👍</p>
      ) : (
        <>
          <table className="w-full text-body">
            <thead>
              <tr className="border-b-2 border-navy-900 text-left">
                <th className="py-2">학생</th>
                <th className="py-2">언제</th>
                <th className="py-2">무엇</th>
                <th className="py-2 text-right">타수 · 정확도</th>
                <th className="py-2">이유</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-win-shadow">
                  <td className="py-2">{names.get(a.student_id) ?? "-"}</td>
                  <td className="py-2 text-small">{when(a.created_at)}</td>
                  <td className="py-2 text-small">
                    {a.kind === "game" ? (GAME_LABELS[a.mode as SoloGame] ?? KIND_LABELS[a.mode] ?? a.mode) : (KIND_LABELS[a.kind] ?? a.kind)} ·{" "}
                    {TRACK_LABELS[a.track as Track]}
                  </td>
                  <td className="py-2 text-right">
                    {a.cpm}타 · {Number(a.accuracy)}%
                  </td>
                  <td className="py-2 text-small">{(a.flags as string[]).map((f) => FLAG_LABELS[f] ?? f).join(", ")}</td>
                  <td className="py-2 text-right">
                    <form action={reviewAttempt} className="flex justify-end gap-1">
                      <input type="hidden" name="classId" value={classId} />
                      <input type="hidden" name="attemptId" value={a.id} />
                      <button name="decision" value="approved" className="win-bevel h-8 px-3 active:win-bevel-pressed">
                        인정
                      </button>
                      <button name="decision" value="rejected" className="win-bevel h-8 px-3 active:win-bevel-pressed">
                        무효
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-small text-text-muted">
            인정하면 기본 코인을 주고, 앞으로의 기준값·성장 점수에 들어가요(오늘 기록이면 오늘 점수도 다시 계산). 단계 통과는 다시 도전해야 해요.
            무효로 하면 계속 빼 둬요.
          </p>
        </>
      )}
    </RetroWindow>
  );
}

/** 반 미니룸 보기 + 추천 닫기·가구 빼기 */
export async function RoomAdmin({ classId, teacherId }: { classId: string; teacherId: string }) {
  const room = await loadRoom({ userId: teacherId, classId });
  if (!room) return null;
  const placed = [
    ...room.furniture,
    ...(room.wall !== "wall-cream" ? [room.wall] : []),
    ...(room.floor !== "floor-wood" ? [room.floor] : []),
  ];

  return (
    <RetroWindow title={`반 미니룸 (반 지갑 ${room.classCoins}코인)`}>
      {!room.ready && <p className="mb-2 font-bold">미니룸 표가 아직 없어요. SQL(20261025000004)을 먼저 실행해 주세요.</p>}
      <div className="max-w-2xl">
        <ClassRoom wall={room.wall} floor={room.floor} furniture={room.furniture} members={room.members} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-1 font-bold">투표 중인 추천 (찬성 {room.need}명이면 구매)</p>
          {room.proposals.length === 0 ? (
            <p className="text-small text-text-muted">없어요.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {room.proposals.map((p) => (
                <li key={p.id} className="flex items-center gap-2 border-b border-win-shadow py-1">
                  <span className="flex-1">
                    {roomItem(p.itemId)?.name} <span className="text-small text-text-muted">({p.proposer} · 찬성 {p.votes})</span>
                  </span>
                  <form action={closeRoomProposal}>
                    <input type="hidden" name="classId" value={classId} />
                    <input type="hidden" name="proposalId" value={p.id} />
                    <button className="win-bevel h-8 px-3 active:win-bevel-pressed">닫기</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-1 font-bold">놓인 아이템</p>
          {placed.length === 0 ? (
            <p className="text-small text-text-muted">아직 없어요.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {placed.map((id) => (
                <li key={id} className="flex items-center gap-2 border-b border-win-shadow py-1">
                  <span className="flex-1">{roomItem(id)?.name}</span>
                  <form action={removeRoomItem}>
                    <input type="hidden" name="classId" value={classId} />
                    <input type="hidden" name="itemId" value={id} />
                    <button className="win-bevel h-8 px-3 active:win-bevel-pressed">빼기</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-small text-text-muted">빼도 코인은 돌려주지 않아요.</p>
        </div>
      </div>
    </RetroWindow>
  );
}

/** 최근 n일 동안의 기록 (페이지는 요청마다 새로 그려요) */
async function recentMissedKeys(classId: string, days: number) {
  await connection(); // 지금 시각 기준이라 요청마다 새로
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return createAdminClient()
    .from("attempts")
    .select("missed_keys, keystrokes")
    .eq("class_id", classId)
    .neq("kind", "placement")
    .gte("created_at", since)
    .limit(3000);
}

/** 반 약한 키 히트맵 (PRD T3: 반별 상위 오타 키 10개) */
export async function ClassWeakKeys({ classId }: { classId: string }) {
  const { data } = await recentMissedKeys(classId, TEACHER_VIEW.heatmapDays);
  const counts: Record<string, number> = {};
  let strokes = 0;
  for (const a of data ?? []) {
    strokes += a.keystrokes;
    for (const [k, n] of Object.entries((a.missed_keys ?? {}) as Record<string, number>)) {
      if (k.trim()) counts[k] = (counts[k] ?? 0) + n;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const top = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TEACHER_VIEW.heatmapTop);

  return (
    <RetroWindow title={`반 약한 키 (최근 ${TEACHER_VIEW.heatmapDays}일)`}>
      {total === 0 ? (
        <p>아직 기록이 없어요. 학생들이 연습하면 여기에 자주 틀리는 키가 모여요.</p>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <KeyHeatmap counts={counts} />
          <div className="min-w-48 flex-1">
            <p className="mb-1 font-bold">자주 틀리는 키 TOP {TEACHER_VIEW.heatmapTop}</p>
            <ol className="flex flex-col">
              {top.map(([k, n], i) => (
                <li key={k} className="flex items-center gap-2 border-b border-win-shadow py-1">
                  <span className="w-6 text-right text-small">{i + 1}</span>
                  <span className="w-10 text-center font-typing text-heading">{k}</span>
                  <span className="text-small text-text-muted">{keyOf(k) ? `${keyOf(k)!.toUpperCase()} 키` : ""}</span>
                  <span className="ml-auto">{n}번 · {Math.round((n / total) * 100)}%</span>
                </li>
              ))}
            </ol>
            <p className="mt-2 text-small text-text-muted">
              전체 {strokes.toLocaleString()}타 중 오타 {total.toLocaleString()}번. 수업 시작 전에 위 키들이 들어간 낱말로 함께 연습해 보세요.
            </p>
          </div>
        </div>
      )}
    </RetroWindow>
  );
}
