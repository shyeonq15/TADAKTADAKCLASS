// 한정 아이템이 열렸는지 (화면·서버 같이 씀)

import { TIER_LABELS, TIERS, TRACK_LABELS, type Tier, type Track } from "@/config/game";
import { badge } from "@/config/badges";
import type { ItemLock } from "@/config/shop";
import { allTiers, isCodeMaster, profileTier } from "@/lib/scoring/tier";

/** 잠금을 확인하는 데 필요한 내 상태 */
export type LockContext = {
  unlocked: Record<Track, number>;
  /** 격파한 보스 중 가장 높은 티어 */
  bossTier: Tier | null;
  /** 모은 칭호 id */
  badges: readonly string[];
};

const atLeast = (t: Tier | null, min: Tier) => t !== null && TIERS.indexOf(t) >= TIERS.indexOf(min);

export function lockOpen(lock: ItemLock | undefined, ctx: LockContext): boolean {
  if (!lock) return true;
  const tiers = allTiers(ctx.unlocked);
  if ("codeMaster" in lock) return isCodeMaster(tiers);
  if ("badge" in lock) return ctx.badges.includes(lock.badge);
  if ("bossTier" in lock) return atLeast(ctx.bossTier, lock.bossTier);
  if ("track" in lock) return atLeast(tiers[lock.track], lock.tier);
  return atLeast(profileTier(tiers), lock.tier);
}

export function lockLabel(lock: ItemLock): string {
  if ("codeMaster" in lock) return "코드 트랙 다이아가 되면 열려요";
  if ("badge" in lock) return `칭호 "${badge(lock.badge)?.name ?? lock.badge}"를 모으면 열려요`;
  if ("bossTier" in lock) return `보스 티어 ${TIER_LABELS[lock.bossTier]}가 되면 열려요`;
  if ("track" in lock) return `${TRACK_LABELS[lock.track]} 트랙 ${TIER_LABELS[lock.tier]}가 되면 열려요`;
  return `${TIER_LABELS[lock.tier]} 티어가 되면 열려요`;
}
