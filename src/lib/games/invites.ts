import "server-only";

// 친구 대결 신청 지키기 (서버 전용)
//  · "대결 신청 받지 않기"를 켠 친구에게는 신청을 보낼 수 없어요
//  · 너무 자주 보내지 못하게 세어요 (같은 친구에게, 전체로)
// 신청 팝업은 실시간 채널로 가지만, 보내기 전에 꼭 이 확인을 거쳐요.

import { RACE } from "@/config/game";
import { createAdminClient } from "@/lib/supabase/admin";

const missing = (e: { code?: string } | null) => !!e && ["42P01", "PGRST205", "42703", "PGRST204"].includes(e.code ?? "");

export async function getBlockInvites(userId: string) {
  const { data, error } = await createAdminClient().from("profiles").select("block_invites").eq("id", userId).maybeSingle();
  if (error) return false;
  return !!(data as { block_invites?: boolean } | null)?.block_invites;
}

export async function setBlockInvites(userId: string, on: boolean): Promise<{ ok: true } | { error: string }> {
  const { error } = await createAdminClient().from("profiles").update({ block_invites: on }).eq("id", userId);
  if (error) return { error: missing(error) ? "아직 준비 중이에요. 선생님께 알려 주세요!" : "바꾸지 못했어요. 다시 해 주세요." };
  return { ok: true };
}

/** 대결 신청을 보내도 되는지 확인하고, 되면 기록해요 */
export async function checkInvite(fromId: string, toId: string): Promise<{ ok: true } | { error: string }> {
  if (fromId === toId) return { error: "나에게는 신청할 수 없어요." };
  if (await getBlockInvites(toId)) return { error: "이 친구는 지금 대결 신청을 받지 않아요." };
  const admin = createAdminClient();
  const since = new Date(Date.now() - RACE.invites.windowMinutes * 60000).toISOString();
  const { data, error } = await admin.from("race_invites").select("to_id").eq("from_id", fromId).gte("created_at", since);
  if (missing(error)) return { ok: true }; // 아직 SQL 전: 예전처럼
  const sent = data ?? [];
  if (sent.length >= RACE.invites.maxPerWindow) return { error: `신청을 너무 많이 보냈어요. ${RACE.invites.windowMinutes}분 뒤에 다시 해 주세요.` };
  if (sent.filter((s) => s.to_id === toId).length >= RACE.invites.maxSameFriend)
    return { error: "이 친구에게는 신청을 여러 번 보냈어요. 친구가 받을 때까지 기다려 주세요." };
  await admin.from("race_invites").insert({ from_id: fromId, to_id: toId });
  return { ok: true };
}
