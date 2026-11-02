import { RAID } from "@/config/game";
import { PixelProgressBar } from "@/components/ui/PixelProgressBar";
import { RetroWindow } from "@/components/ui/RetroWindow";
import type { RaidData } from "@/lib/raid/server";

/** 이번 주 협동 레이드: 보스 체력, 반 합계, 내 기여 (개인 순위는 보여 주지 않아요) */
export function RaidWindow({ raid }: { raid: RaidData }) {
  const left = Math.max(0, raid.hp - raid.damage);
  return (
    <RetroWindow title="⚔️ 이번 주 협동 레이드">
      <div className="flex flex-col gap-3 font-pixel text-body text-navy-900 md:flex-row md:items-center">
        <div className="flex flex-col items-center px-4">
          <span className={`text-[64px] leading-none ${raid.defeated ? "opacity-30 grayscale" : "animate-bob"}`} aria-hidden>
            {raid.boss.icon}
          </span>
          <strong className="font-title text-heading">{raid.boss.name}</strong>
          <span className="text-small text-text-muted">
            {raid.week.start.slice(5)} ~ {raid.week.end.slice(5)}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {raid.defeated ? (
            <p className="title-lime text-title">격파 성공! 🎉</p>
          ) : (
            <p>
              남은 체력 <strong className="font-title text-heading">{left.toLocaleString()}</strong> / {raid.hp.toLocaleString()}
            </p>
          )}
          <PixelProgressBar value={1 - left / raid.hp} cells={24} label="보스에게 준 피해" />
          <p className="text-small">
            우리 반 {raid.joined}/{raid.members}명이 함께 쳤어요 · 내가 준 피해 <strong>{raid.mine.toLocaleString()}</strong>타
          </p>
          <p className="text-small text-text-muted">
            이번 주(월~일)에 맞게 친 글자 수(타)가 모두 피해가 돼요. 연습·오늘의 미션·교과 탐험·게임 전부요. 쓰러뜨리면 반 지갑에 {RAID.classReward}코인,
            이번 주 {RAID.minContribution}타(연습 2~3판) 이상 친 친구에게는 {RAID.personalReward}코인씩! 월요일마다 새 보스가 나타나요.
          </p>
        </div>
      </div>
      {raid.board.length > 0 && (
        <div className="mt-4 border-t-3 border-dashed border-navy-900 pt-3">
          <p className="mb-2 font-title text-heading text-navy-900">⚔️ 이번 주 기여 순위</p>
          <ol className="grid gap-x-4 font-pixel text-body text-navy-900 sm:grid-cols-2">
            {raid.board.map((b, i) => {
              const top = raid.board[0]?.keystrokes || 1;
              return (
                <li key={b.id} className={`flex items-center gap-2 border-b border-win-shadow py-1 ${b.me ? "bg-yellow-400/40 font-bold" : ""}`}>
                  <span className="w-8 shrink-0 text-center">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                  <span className="w-28 shrink-0 break-all">
                    {b.nickname}
                    {b.me && <span className="text-small"> (나)</span>}
                  </span>
                  <span className="h-3 flex-1 border-2 border-navy-900 bg-paper">
                    <span className="block h-full bg-lime-400" style={{ width: `${(b.keystrokes / top) * 100}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right text-small">
                    {b.keystrokes.toLocaleString()}타{b.keystrokes >= RAID.minContribution ? " ⚔️" : ""}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="mt-1 font-pixel text-small text-text-muted">⚔️ = 이번 주 {RAID.minContribution}타 넘김 (격파하면 코인을 받아요). 아직 0타인 친구도 한 판이면 함께할 수 있어요!</p>
        </div>
      )}
    </RetroWindow>
  );
}
