import { SUBJECT_POINTS } from "@/config/subjects";
import type { RankEntry } from "@/lib/rank/people";

// 과목 랭킹 (교과 탐험 과목 탭, 영단어 연구소): 과목 점수 = 별·기록 갱신·연습한 날을 하나로

const MEDALS = ["🥇", "🥈", "🥉"];

export type MyPoints = { score: number; stars: number; improves: number; days: number };

export function SubjectRank({ title, entries, mine }: { title: string; entries: RankEntry[]; mine: MyPoints | null }) {
  return (
    <div className="flex flex-col gap-2 font-pixel text-navy-900">
      <p className="font-title text-heading">{title}</p>
      <p className="border-2 border-navy-900 bg-yellow-400 px-3 py-1 text-body">
        {mine ? (
          <>
            내 과목 점수 <strong>{mine.score}점</strong>
            <span className="ml-2 text-small">
              = ★{mine.stars}×{SUBJECT_POINTS.star} + 갱신 {mine.improves}×{SUBJECT_POINTS.improve} + {mine.days}일×{SUBJECT_POINTS.day}
            </span>
          </>
        ) : (
          "아직 내 점수가 없어요. 지문을 치거나 퀴즈를 풀면 점수가 생겨요!"
        )}
      </p>
      {entries.length === 0 ? (
        <p className="text-small text-text-muted">아직 랭킹에 오른 친구가 없어요. 첫 주인공이 되어 봐요!</p>
      ) : (
        <ol className="flex flex-col gap-0.5 border-2 border-navy-900 bg-surface px-3 py-2 text-small">
          {entries.map((e, i) => (
            <li key={i} className={`flex items-baseline gap-2 ${e.me ? "bg-yellow-400 font-bold" : ""}`}>
              <span className="w-6 text-center">{MEDALS[i] ?? i + 1}</span>
              <span className="flex-1 truncate">
                {e.nickname} <span className="text-text-muted">{e.classNo}반</span>
                {e.me && " (나)"}
              </span>
              {e.detail && <span className="hidden text-text-muted sm:inline">{e.detail}</span>}
              <span className="w-16 text-right font-bold">{e.value}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-small text-text-muted">
        과목 점수 = 별 × {SUBJECT_POINTS.star} + 내 기록 갱신 × {SUBJECT_POINTS.improve} + 연습한 날 × {SUBJECT_POINTS.day}. 별은 지문·퀴즈에서, 갱신은 같은 지문을
        다시 쳐서 내 최고 타수를 넘을 때마다 생겨요. 느려도 꾸준히 하면 올라가요! (같은 학년 친구들끼리, 닉네임으로만)
      </p>
    </div>
  );
}
