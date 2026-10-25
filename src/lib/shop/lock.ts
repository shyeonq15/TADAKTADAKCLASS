// 티어 한정 아이템이 열렸는지 (화면·서버 같이 씀)

import { TIER_LABELS, TIERS, type Track } from "@/config/game";
import type { ItemLock } from "@/config/shop";
import { allTiers, isCodeMaster, profileTier } from "@/lib/scoring/tier";

export function lockOpen(lock: ItemLock | undefined, unlocked: Record<Track, number>): boolean {
  if (!lock) return true;
  const tiers = allTiers(unlocked);
  if ("codeMaster" in lock) return isCodeMaster(tiers);
  return TIERS.indexOf(profileTier(tiers)) >= TIERS.indexOf(lock.tier);
}

export function lockLabel(lock: ItemLock): string {
  return "codeMaster" in lock ? "코드 트랙 다이아가 되면 열려요" : `${TIER_LABELS[lock.tier]} 티어가 되면 열려요`;
}
