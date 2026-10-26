import type { BattleData } from "@/lib/battle/server";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const md = (day: string) => {
  const [, m, d] = day.split("-").map(Number);
  return `${m}/${d}`;
};

/** 반 대결 순위판: 반 점수 막대 + 지난 대결 결과. 개인 순위는 보여 주지 않아요 (CLAUDE.md 6장) */
export function BattleBoard({ data, compact = false }: { data: BattleData; compact?: boolean }) {
  const top = Math.max(1, ...data.rows.map((r) => r.score));
  const announce = new Date(Date.parse(`${data.period.end}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-3 font-pixel text-body text-navy-900">
      {!data.ready && (
        <p className="border-2 border-navy-900 bg-paper p-2 font-bold">반 대결 결과 저장 준비가 아직 안 됐어요. 선생님께 알려 주세요.</p>
      )}
      {data.last && data.last.winners.length > 0 && (
        <p className="border-2 border-navy-900 bg-yellow-400 px-3 py-2 font-bold">
          🏆 지난 대결({md(data.last.start)}~{md(data.last.end)}) 1위: {data.last.winners.map((n) => `${n}반`).join(", ")}! 반 지갑에 보너스{" "}
          {data.last.bonus}코인이 들어갔다!
        </p>
      )}
      <p className="flex flex-wrap items-baseline gap-x-3">
        <strong className="font-title text-heading">{data.grade}학년 반 대결</strong>
        <span>
          {md(data.period.start)}(월) ~ {md(data.period.end)}(일)
        </span>
        <span className="bg-navy-900 px-2 text-paper">D-{data.period.daysLeft}</span>
        <span className="text-small text-text-muted">결과 발표 {md(announce)}(월)</span>
      </p>

      {data.rows.length === 0 ? (
        <p>아직 같은 학년 반이 없어요.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {data.rows.map((r) => (
            <li
              key={r.classId}
              className={`flex items-center gap-3 px-2 py-1 ${r.mine ? "win-bevel-pressed bg-yellow-100" : ""}`}
              style={r.mine ? { background: "#fff6d6" } : undefined}
            >
              <span className="w-10 shrink-0 text-center font-title text-heading">{MEDAL[r.rank] ?? `${r.rank}위`}</span>
              <span className="w-24 shrink-0 whitespace-nowrap font-bold">
                {r.classNo}반{r.mine && <span className="ml-1 text-small">(우리)</span>}
              </span>
              <div className="h-5 flex-1 border-2 border-navy-900 bg-cream">
                <div className={`h-full ${r.mine ? "bg-lime-400" : "bg-sky-500"}`} style={{ width: `${(r.score / top) * 100}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right font-title text-heading">{r.score}점</span>
              {!compact && (
                <span className="w-24 shrink-0 text-right text-small text-text-muted">
                  참여 {r.joined}/{r.members}명
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!compact && (
        <div className="border-t-2 border-win-shadow pt-2 text-small text-text-muted">
          <p>반 점수 = 우리 반 친구들의 성장 점수를 모두 더해서 반 인원으로 나눈 값이에요.</p>
          <p>빠르게 치는 것보다 <strong>내 기록보다 나아지는 것</strong>이 점수가 돼요. 한 명 한 명의 참여가 반 점수를 올려요!</p>
          {data.myPoints !== null && (
            <p className="mt-1 font-bold text-navy-900">이번 대결에서 내가 보탠 성장 점수: {data.myPoints}점</p>
          )}
        </div>
      )}
    </div>
  );
}
