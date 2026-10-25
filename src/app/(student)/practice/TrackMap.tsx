"use client";

import Link from "next/link";
import { LEVEL_CLEAR, TRACK_LABELS, TRACKS } from "@/config/game";
import { MODE_LABELS, PACKS } from "@/data/packs";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BUNNY } from "@/components/pixel/sprites";
import { PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { HelpButton } from "@/components/ui/HelpButton";
import { LevelHelp, TierHelp } from "@/components/help/HelpContent";
import { usePracticeData, weakKeys } from "@/lib/practice/store";
import { allTiers, isCodeMaster } from "@/lib/scoring/tier";

/** DESIGN.md 7장 트랙 선택: START → 레벨 핀 → 트로피. 현재 위치에 내 미니미 */
export function TrackMap() {
  const { attempts, progress, packs } = usePracticeData();
  const tiers = allTiers(attempts);

  return (
    <div className="flex flex-col gap-5">
      {!progress.placement && (
        <div className="flex items-center justify-between gap-4 bg-ink px-4 py-3 font-pixel text-body text-paper">
          <span>
            <strong className="mr-3 font-title">NEW</strong>2분 배치 테스트를 하면 내 실력에 맞는 레벨부터 시작해요!
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

      {TRACKS.map((track, ti) => {
        const pack = PACKS[track];
        const unlocked = progress.unlocked[track];
        const weak = weakKeys(attempts, track, 3);
        return (
          <RetroWindow key={track} title={`${ti + 1}단계 · ${TRACK_LABELS[track]} 트랙`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-title text-heading">{TRACK_LABELS[track]}</h2>
                <TierBadge tier={tiers[track]} codeMaster={track === "code" && isCodeMaster(tiers)} />
                <HelpButton title="티어란?">
                  <TierHelp />
                </HelpButton>
              </div>
              {weak.length > 0 && (
                <PixelLink href={`/practice/weak/${track}`} size="sm" variant="reward">
                  약한 키 연습 · {weak.map((w) => w.key).join(" ")}
                </PixelLink>
              )}
            </div>

            {/* 길 */}
            <ol className="relative mt-4 flex items-end justify-between gap-2 px-2 pb-2">
              <div aria-hidden className="absolute inset-x-2 bottom-[34px] h-3 bg-road" />
              <li className="relative z-10 flex flex-col items-center">
                <span className="border-3 border-navy-900 bg-paper px-2 font-title text-small">START</span>
                <span className="h-12" />
              </li>
              {pack.levels.map((lv) => {
                const cleared = progress.cleared.includes(`${track}-${lv.level}`);
                const open = lv.level <= unlocked;
                const here = lv.level === unlocked;
                const pin = (
                  <span
                    className={`flex size-12 items-center justify-center border-3 border-navy-900 font-title text-heading shadow-pixel-sm ${
                      cleared ? "bg-lime-400" : open ? (lv.advanced ? "bg-pink-400" : "bg-yellow-400") : "bg-win-gray text-text-muted"
                    }`}
                  >
                    {cleared ? "✓" : open ? lv.level : "🔒"}
                  </span>
                );
                return (
                  <li key={lv.level} className="relative z-10 flex flex-col items-center gap-1">
                    <span className="flex h-9 items-end">
                      {here ? (
                        <PixelSprite sprite={BUNNY} scale={3} />
                      ) : lv.advanced ? (
                        <span className="bg-ink px-1 font-pixel text-small text-paper">심화</span>
                      ) : null}
                    </span>
                    {open ? (
                      <Link href={`/practice/${track}/${lv.level}`} aria-label={`레벨 ${lv.level} ${lv.title}`}>
                        {pin}
                      </Link>
                    ) : (
                      pin
                    )}
                    <span className="mt-1 text-center font-pixel text-small leading-tight">
                      {lv.title}
                      <br />
                      <span className="text-text-muted">
                        {MODE_LABELS[lv.mode]} · {lv.goalCpm}타
                      </span>
                    </span>
                  </li>
                );
              })}
              <li className="relative z-10 flex flex-col items-center">
                <span className="font-title text-hero leading-none text-yellow-400 [text-shadow:2px_2px_0_var(--navy-900)]">🏆</span>
                <span className="h-8" />
              </li>
            </ol>
          </RetroWindow>
        );
      })}

      <p className="flex items-center justify-center gap-2 font-pixel text-small text-navy-900">
        <HelpButton title="레벨은 어떻게 열려요?">
          <LevelHelp />
        </HelpButton>
        레벨 통과 조건: 정확도 {LEVEL_CLEAR.minAccuracy}% 이상 + 레벨마다 정해진 타수. 통과하면 다음 레벨이 열려요.
      </p>
    </div>
  );
}
