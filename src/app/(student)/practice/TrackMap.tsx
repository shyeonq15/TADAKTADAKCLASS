"use client";

import Link from "next/link";
import { useState } from "react";
import { STEPS_PER_TIER, TIER_LABELS, TIERS, TRACK_LABELS, TRACKS, type Track } from "@/config/game";
import { MODE_LABELS } from "@/data/packs";
import { LevelHelp, TierHelp } from "@/components/help/HelpContent";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BUNNY } from "@/components/pixel/sprites";
import { HelpButton } from "@/components/ui/HelpButton";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { getStage } from "@/lib/practice/stages";
import { usePracticeData, weakKeys } from "@/lib/practice/store";
import { allTiers, isCodeMaster, tierProgress } from "@/lib/scoring/tier";

/** 한 트랙의 사다리: 티어 6줄 × 5단계. 지금 단계에 내 미니미 */
function Ladder({ track }: { track: Track }) {
  const { progress } = usePracticeData();
  const unlocked = progress.unlocked[track];
  const tiers = allTiers(progress.unlocked);
  const tp = tierProgress(progress.unlocked, progress.cleared, track);

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-1 flex flex-wrap items-center gap-3 font-pixel text-body">
        <TierBadge tier={tiers[track]} codeMaster={track === "code" && isCodeMaster(tiers)} />
        <HelpButton title="티어와 단계">
          <TierHelp />
        </HelpButton>
        <span className="text-navy-900">
          {tp.next
            ? `${TIER_LABELS[tp.current]} ${tp.need}단계 중 ${tp.done}단계 클리어 · 다 깨면 ${TIER_LABELS[tp.next]}!`
            : tp.allDone
              ? "레전드까지 모두 깼어요! 대단해요!"
              : `마지막 레전드 ${tp.done} / ${tp.need}`}
        </span>
      </div>

      {/* 위 티어가 위에 오도록 거꾸로 */}
      {[...TIERS].reverse().map((tier) => {
        const ti = TIERS.indexOf(tier);
        const first = ti * STEPS_PER_TIER + 1;
        const reached = unlocked >= first;
        const isCurrent = tiers[track] === tier;
        return (
          <div
            key={tier}
            className={`flex items-center gap-3 px-2 pb-2 pt-6 ${isCurrent ? "border-3 border-navy-900 bg-cream" : reached ? "" : "opacity-60"}`}
          >
            <span className="w-24 shrink-0">
              <TierBadge tier={tier} />
            </span>
            <ol className="flex flex-1 items-end gap-2">
              {Array.from({ length: STEPS_PER_TIER }, (_, i) => {
                const n = first + i;
                const stage = getStage(track, n)!;
                const cleared = progress.cleared.includes(`${track}-${n}`);
                const open = n <= unlocked;
                const here = n === unlocked && !cleared;
                const pin = (
                  <span
                    className={`flex h-14 w-full flex-col items-center justify-center border-3 border-navy-900 font-title shadow-pixel-sm ${
                      cleared ? "bg-lime-400" : here ? "bg-yellow-400" : open ? "bg-sky-100" : "bg-win-gray text-text-muted"
                    }`}
                  >
                    <span className="text-heading leading-none">{cleared ? "✓" : open ? i + 1 : "🔒"}</span>
                    <span className="font-pixel text-small leading-tight">{stage.goalCpm}타</span>
                  </span>
                );
                return (
                  <li key={n} className="relative flex flex-1 flex-col items-center">
                    {here && <PixelSprite sprite={BUNNY} scale={2} className="absolute -top-6" />}
                    {open ? (
                      <Link
                        href={`/practice/${track}/${n}`}
                        className="w-full"
                        aria-label={`${TIER_LABELS[tier]} ${i + 1}단계 · ${stage.level.title} · ${stage.goalCpm}타`}
                        title={`${stage.level.title} (${MODE_LABELS[stage.level.mode]}) · ${stage.goalCpm}타 · 정확도 ${stage.minAccuracy}%`}
                      >
                        {pin}
                      </Link>
                    ) : (
                      pin
                    )}
                    <span className="mt-1 max-w-full truncate text-center font-pixel text-small text-text-muted">
                      {stage.level.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

/** 연습 트랙: 트랙 탭 + 티어 사다리 */
export function TrackMap() {
  const { attempts, progress, packs } = usePracticeData();
  const tiers = allTiers(progress.unlocked);
  const [track, setTrack] = useState<Track>("korean");
  const weak = weakKeys(attempts, track, 3);

  return (
    <div className="flex flex-col gap-5">
      {!progress.placement && (
        <div className="flex items-center justify-between gap-4 bg-ink px-4 py-3 font-pixel text-body text-paper">
          <span>
            <strong className="mr-3 font-title">NEW</strong>2분 배치 테스트를 하면 내 실력에 맞는 단계부터 시작해요!
          </span>
          <PixelLink href="/placement" size="sm" variant="success">
            배치 테스트
          </PixelLink>
        </div>
      )}

      {packs.length > 0 && (
        <RetroWindow title="선생님 연습">
          <ul className="grid gap-2 md:grid-cols-2">
            {packs.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/practice/pack/${p.id}`}
                  className="win-bevel flex items-center justify-between gap-2 px-3 py-2 font-pixel text-body text-navy-900"
                >
                  <span>
                    📝 <strong>{p.title}</strong>
                    <span className="ml-2 text-small text-text-muted">
                      {TRACK_LABELS[p.track]} · {p.rounds}판
                    </span>
                  </span>
                  {p.missionToday && <span className="bg-ink px-2 text-small text-paper">오늘의 미션</span>}
                </Link>
              </li>
            ))}
          </ul>
        </RetroWindow>
      )}

      <div>
        <div role="tablist" aria-label="트랙" className="flex flex-wrap gap-1 px-2">
          {TRACKS.map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={track === t}
              onClick={() => setTrack(t)}
              className={`flex h-11 items-center gap-2 px-4 font-pixel text-body text-navy-900 ${
                track === t ? "win-bevel relative top-[3px] z-10 font-bold" : "win-bevel-pressed bg-[#c4c0b8]"
              }`}
            >
              {TRACK_LABELS[t]}
              <TierBadge tier={tiers[t]} />
            </button>
          ))}
        </div>
        <RetroWindow title={`${TRACK_LABELS[track]} 트랙`}>
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            {track === "code" && (
              <>
                <PixelLink href="/learn" size="sm" variant="success">
                  📘 파이썬 첫걸음
                </PixelLink>
                <PixelLink href="/practice/blank" size="sm" variant="primary">
                  🧩 빈칸 채우기
                </PixelLink>
              </>
            )}
            {weak.length > 0 && (
              <PixelLink href={`/practice/weak/${track}`} size="sm" variant="reward">
                약한 키 연습 · {weak.map((w) => w.key).join(" ")}
              </PixelLink>
            )}
          </div>
          <Ladder key={track} track={track} />
        </RetroWindow>
      </div>

      <p className="flex items-center justify-center gap-2 font-pixel text-small text-navy-900">
        <HelpButton title="단계는 어떻게 깨요?">
          <LevelHelp />
        </HelpButton>
        핀 아래 숫자가 목표 타수예요. 목표 타수와 정확도를 넘기면 그 단계를 깨고 다음 단계가 열려요.
      </p>
    </div>
  );
}
