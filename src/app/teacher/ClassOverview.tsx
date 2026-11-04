import Link from "next/link";
import { TIER_LABELS, TRACK_LABELS, TRACKS } from "@/config/game";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { tierOfStage } from "@/lib/practice/stages";
import type { ClassDash } from "@/lib/teacher/dashboard";

/** 선생님 첫 화면: 반별 참여도·진도를 한 표로 비교 (테스트 계정은 빼고) */
export function ClassOverview({ dashes }: { dashes: ClassDash[] }) {
  if (!dashes.length) return null;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  return (
    <RetroWindow title="📊 반별 한눈에 보기 (이번 주)">
      <div className="overflow-x-auto">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b-2 border-navy-900 text-left">
              <th className="px-1 py-2">반</th>
              <th className="px-1 py-2 text-right">참여</th>
              <th className="px-1 py-2 text-right">오늘 미션</th>
              <th className="px-1 py-2 text-right">연습·미션</th>
              <th className="px-1 py-2 text-right">게임</th>
              <th className="px-1 py-2 text-right">교과 탐험</th>
              <th className="px-1 py-2 text-right">1인당 타수</th>
              {TRACKS.map((t) => (
                <th key={t} className="px-1 py-2 text-right">
                  {TRACK_LABELS[t]} 평균
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {dashes.map((d) => {
              const s = d.summary;
              const games = s.week.rain + s.week.runner + s.week.vocab + s.week.boss + s.week.race;
              return (
                <tr key={d.classId} className="border-b border-win-shadow">
                  <td className="whitespace-nowrap px-1 py-2 font-bold">
                    {d.grade}-{d.classNo}
                  </td>
                  <td className="whitespace-nowrap px-1 py-2 text-right">
                    {s.activeWeek}/{s.members}명 <span className="text-small text-text-muted">({pct(s.activeWeek, s.members)}%)</span>
                  </td>
                  <td className="whitespace-nowrap px-1 py-2 text-right">
                    {s.missionToday}/{s.members}
                  </td>
                  <td className="px-1 py-2 text-right">{s.week.practice + s.week.mission}</td>
                  <td className="px-1 py-2 text-right" title={`단어 비 ${s.week.rain} · 토끼 ${s.week.runner} · 뜻 비 ${s.week.vocab} · 보스 ${s.week.boss} · 대결 ${s.week.race}`}>
                    {games}
                  </td>
                  <td className="px-1 py-2 text-right">{s.week.explore}</td>
                  <td className="px-1 py-2 text-right">{s.members ? Math.round(s.week.keystrokes / s.members).toLocaleString() : 0}</td>
                  {TRACKS.map((t) => (
                    <td key={t} className="whitespace-nowrap px-1 py-2 text-right">
                      {s.avgStage[t]} <span className="text-small text-text-muted">{TIER_LABELS[tierOfStage(Math.round(s.avgStage[t]))]}</span>
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-1 py-2 text-right">
                    <Link href={`/teacher/classes/${d.classId}`} className="underline underline-offset-4">
                      자세히 ▶
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-small text-text-muted">
        참여 = 이번 주(월~)에 한 판이라도 친 학생. 평균은 트랙 단계(1~35)의 평균이에요. 반을 누르면 학생별 티어·단계와 게임 참여를 볼 수 있어요.
      </p>
    </RetroWindow>
  );
}
