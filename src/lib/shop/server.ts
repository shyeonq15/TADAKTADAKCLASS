import "server-only";

// 상점: 미니미 아이템 사기·입기 (서버 전용). 가격·잠금은 서버가 다시 확인해요.

import { FREE_ITEMS, MINIMI_SLOTS, minimiItem, type MinimiLook, type MinimiSlot } from "@/config/shop";
import { loadUncached, type Who } from "@/lib/practice/server";
import type { PracticeData } from "@/lib/practice/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { lockOpen } from "./lock";

export type ShopData = {
  owned: string[];
  look: MinimiLook;
  /** 데이터베이스 표가 아직 없으면 false (선생님이 SQL을 실행해야 함) */
  ready: boolean;
};

/** 저장된 모양에서 없는 아이템·다른 칸 아이템은 빼고 돌려줌 */
export function cleanLook(raw: unknown): MinimiLook {
  const look: MinimiLook = {};
  if (!raw || typeof raw !== "object") return look;
  for (const slot of MINIMI_SLOTS) {
    const id = (raw as Record<string, unknown>)[slot];
    if (typeof id === "string" && minimiItem(id)?.slot === slot) look[slot] = id;
  }
  return look;
}

export async function loadShop(userId: string): Promise<ShopData> {
  const admin = createAdminClient();
  const [items, look] = await Promise.all([
    admin.from("student_items").select("item_id").eq("student_id", userId),
    admin.from("minimi_looks").select("look").eq("student_id", userId).maybeSingle(),
  ]);
  return {
    owned: [...FREE_ITEMS, ...(items.data ?? []).map((i) => i.item_id)],
    look: cleanLook(look.data?.look),
    ready: !items.error && !look.error,
  };
}

/** 여러 학생의 미니미 모양 (미니룸·대결 화면용) */
export async function loadLooks(userIds: string[]): Promise<Record<string, MinimiLook>> {
  if (!userIds.length) return {};
  const { data } = await createAdminClient().from("minimi_looks").select("student_id, look").in("student_id", userIds);
  return Object.fromEntries((data ?? []).map((r) => [r.student_id, cleanLook(r.look)]));
}

type ShopResult = { shop: ShopData; data: PracticeData } | { error: string };

async function saveLook(userId: string, look: MinimiLook) {
  const { error } = await createAdminClient()
    .from("minimi_looks")
    .upsert({ student_id: userId, look, updated_at: new Date().toISOString() });
  return error;
}

export async function buyItem(who: Who, itemId: string): Promise<ShopResult> {
  const item = minimiItem(itemId);
  if (!item) return { error: "없는 아이템이에요." };
  const before = await loadUncached(who.userId);
  if (!lockOpen(item.lock, before.progress.unlocked)) return { error: "아직 잠겨 있는 아이템이에요." };

  const { data: res, error } = await createAdminClient().rpc("buy_student_item", {
    p_student: who.userId,
    p_item: item.id,
    p_price: item.price,
    p_reason: `상점: ${item.name}`,
  });
  if (error) return { error: "상점 준비가 아직 안 됐어요. 선생님께 알려 주세요." };
  if (res === "poor") return { error: "코인이 모자라요. 연습하고 다시 와요!" };

  // 산 아이템은 바로 입혀 줘요
  const shop = await loadShop(who.userId);
  shop.look = { ...shop.look, [item.slot]: item.id };
  await saveLook(who.userId, shop.look);
  return { shop, data: await loadUncached(who.userId) };
}

/** 입기 / 벗기 (itemId 가 null 이면 그 칸을 비움) */
export async function equipItem(who: Who, slot: MinimiSlot, itemId: string | null): Promise<ShopResult> {
  if (!MINIMI_SLOTS.includes(slot)) return { error: "알 수 없는 칸이에요." };
  const shop = await loadShop(who.userId);
  if (itemId !== null) {
    const item = minimiItem(itemId);
    if (!item || item.slot !== slot) return { error: "없는 아이템이에요." };
    if (!shop.owned.includes(item.id)) return { error: "먼저 사야 입을 수 있어요." };
  }
  const look = { ...shop.look };
  if (itemId) look[slot] = itemId;
  else delete look[slot];
  if (await saveLook(who.userId, look)) return { error: "상점 준비가 아직 안 됐어요. 선생님께 알려 주세요." };
  return { shop: { ...shop, look }, data: await loadUncached(who.userId) };
}
