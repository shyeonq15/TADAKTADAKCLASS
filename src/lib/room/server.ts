import "server-only";

// 반 미니룸: 반 친구 미니미 + 반 지갑으로 산 가구. 무엇을 살지는 투표로 정해요. (서버 전용)
//
// 흐름: 누군가 "이거 사자!" 추천 → 반 친구들이 찬성 → 찬성이 기준을 넘고 반 지갑이 넉넉하면 자동으로 사서 놓음

import { ROOM, roomItem, type MinimiLook, type RoomItem } from "@/config/shop";
import { dayKeyKST } from "@/lib/practice/day";
import type { Who } from "@/lib/practice/server";
import { loadLooks } from "@/lib/shop/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type RoomMember = { id: string; nickname: string; number: number; look: MinimiLook; doneToday: boolean };

export type RoomProposal = {
  id: string;
  itemId: string;
  proposer: string;
  votes: number;
  iVoted: boolean;
  mine: boolean;
};

export type RoomData = {
  classId: string;
  wall: string;
  floor: string;
  /** 놓인 가구 아이템 id */
  furniture: string[];
  /** 반 지갑에 이미 있는 벽지·바닥 (다시 바꿀 때는 0코인) */
  ownedSurfaces: string[];
  members: RoomMember[];
  meId: string;
  classCoins: number;
  proposals: RoomProposal[];
  /** 사려면 필요한 찬성 수 */
  need: number;
  /** 데이터베이스 표가 아직 없으면 false */
  ready: boolean;
};

export const votesNeeded = (classSize: number) => Math.max(ROOM.minVotes, Math.ceil(classSize * ROOM.voteRatio));

/** 이미 가진 벽지·바닥으로 다시 바꿀 때는 무료 */
const priceFor = (item: RoomItem, ownedSurfaces: readonly string[]) =>
  item.kind !== "furniture" && ownedSurfaces.includes(item.id) ? 0 : item.price;

async function loadRaw(classId: string) {
  const admin = createAdminClient();
  const [cls, members, placed, proposals] = await Promise.all([
    admin.from("classes").select("coins").eq("id", classId).single(),
    admin.from("enrollments").select("student_id, number, profiles!inner(nickname, role)").eq("class_id", classId),
    admin.from("room_items").select("item_id, placed_at").eq("class_id", classId).order("placed_at"),
    admin
      .from("room_proposals")
      .select("id, item_id, proposer_id, created_at, room_votes(student_id)")
      .eq("class_id", classId)
      .eq("status", "open")
      .order("created_at"),
  ]);
  return { cls, members, placed, proposals };
}

/** 찬성이 기준을 넘은 추천을 반 지갑으로 사기 (지갑이 모자라면 그대로 둠) */
async function settle(classId: string): Promise<void> {
  const { members, placed, proposals } = await loadRaw(classId);
  if (proposals.error || placed.error) return;
  const need = votesNeeded((members.data ?? []).length);
  const ownedSurfaces = (placed.data ?? []).map((p) => p.item_id).filter((id) => roomItem(id)?.kind !== "furniture");
  const admin = createAdminClient();
  for (const p of proposals.data ?? []) {
    const item = roomItem(p.item_id);
    if (!item || (p.room_votes ?? []).length < need) continue;
    const [x, y] = item.at ?? [0, 0];
    await admin.rpc("buy_room_item", {
      p_proposal: p.id,
      p_price: priceFor(item, ownedSurfaces),
      p_reason: `미니룸: ${item.name}`,
      p_x: x,
      p_y: y,
    });
  }
}

export async function loadRoom(who: Who): Promise<RoomData | null> {
  if (!who.classId) return null;
  const classId = who.classId;
  await settle(classId);
  const { cls, members, placed, proposals } = await loadRaw(classId);

  type MemberRow = { student_id: string; number: number; profiles: { nickname: string | null; role: string } };
  const rows = ((members.data ?? []) as unknown as MemberRow[]).filter((m) => m.profiles.role === "student");
  const ids = rows.map((m) => m.student_id);
  const admin = createAdminClient();
  const [looks, done] = await Promise.all([
    loadLooks(ids),
    ids.length
      ? admin.from("mission_completions").select("student_id").eq("day", dayKeyKST()).in("student_id", ids)
      : Promise.resolve({ data: [] as { student_id: string }[] }),
  ]);
  const doneSet = new Set((done.data ?? []).map((d) => d.student_id));
  const nick = new Map(rows.map((m) => [m.student_id, m.profiles.nickname ?? "친구"]));

  const placedIds = (placed.data ?? []).map((p) => p.item_id).filter((id) => roomItem(id));
  const latest = (kind: RoomItem["kind"], fallback: string) =>
    [...placedIds].reverse().find((id) => roomItem(id)?.kind === kind) ?? fallback;

  return {
    classId,
    wall: latest("wall", "wall-cream"),
    floor: latest("floor", "floor-wood"),
    furniture: [...new Set(placedIds.filter((id) => roomItem(id)?.kind === "furniture"))],
    ownedSurfaces: [...new Set(placedIds.filter((id) => roomItem(id)?.kind !== "furniture"))],
    members: rows
      .map((m) => ({
        id: m.student_id,
        nickname: nick.get(m.student_id) ?? "친구",
        number: m.number,
        look: looks[m.student_id] ?? {},
        doneToday: doneSet.has(m.student_id),
      }))
      .sort((a, b) => a.number - b.number),
    meId: who.userId,
    classCoins: cls.data?.coins ?? 0,
    proposals: (proposals.data ?? [])
      .filter((p) => roomItem(p.item_id))
      .map((p) => {
        const voters = (p.room_votes ?? []).map((v) => v.student_id);
        return {
          id: p.id,
          itemId: p.item_id,
          proposer: p.proposer_id ? (nick.get(p.proposer_id) ?? "친구") : "친구",
          votes: voters.length,
          iVoted: voters.includes(who.userId),
          mine: p.proposer_id === who.userId,
        };
      }),
    need: votesNeeded(rows.length),
    ready: !placed.error && !proposals.error,
  };
}

type RoomResult = { room: RoomData; message: string } | { error: string };

const NOT_READY = { error: "미니룸 준비가 아직 안 됐어요. 선생님께 알려 주세요." };

async function result(who: Who, message: string): Promise<RoomResult> {
  const room = await loadRoom(who);
  return room ? { room, message } : { error: "반에 들어가 있어야 미니룸을 쓸 수 있어요." };
}

/** "이거 사자!" 추천 올리기 (올린 사람은 자동으로 찬성) */
export async function proposeRoomItem(who: Who, itemId: string): Promise<RoomResult> {
  const item = roomItem(itemId);
  if (!item) return { error: "없는 아이템이에요." };
  const room = await loadRoom(who);
  if (!room) return { error: "반에 들어가 있어야 미니룸을 쓸 수 있어요." };
  if (!room.ready) return NOT_READY;
  if (room.furniture.includes(item.id) || room.wall === item.id || room.floor === item.id)
    return { error: "이미 우리 반 미니룸에 있어요." };
  if (room.proposals.some((p) => p.itemId === item.id)) return { error: "이미 누가 추천했어요. 찬성을 눌러 주세요!" };
  if (room.proposals.length >= ROOM.maxOpen) return { error: `추천은 한 번에 ${ROOM.maxOpen}개까지예요. 다른 추천이 끝나면 올려 주세요.` };
  if (room.proposals.filter((p) => p.mine).length >= ROOM.maxOpenPerStudent)
    return { error: "내 추천이 이미 하나 있어요. 그게 끝나면 또 올릴 수 있어요." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("room_proposals")
    .insert({ class_id: room.classId, item_id: item.id, proposer_id: who.userId })
    .select("id")
    .single();
  if (error || !data) return NOT_READY;
  await admin.from("room_votes").insert({ proposal_id: data.id, student_id: who.userId });
  return result(who, `${item.name}을(를) 추천했다! 친구들의 찬성을 모아 봐요.`);
}

/** 찬성 / 찬성 취소 */
export async function voteRoomItem(who: Who, proposalId: string): Promise<RoomResult> {
  const room = await loadRoom(who);
  if (!room) return { error: "반에 들어가 있어야 미니룸을 쓸 수 있어요." };
  const p = room.proposals.find((x) => x.id === proposalId);
  if (!p) return { error: "이미 끝난 추천이에요." };
  const admin = createAdminClient();
  if (p.iVoted) {
    await admin.from("room_votes").delete().eq("proposal_id", p.id).eq("student_id", who.userId);
    // 찬성한 사람이 아무도 없으면 추천을 닫아요
    if (p.votes <= 1) await admin.from("room_proposals").update({ status: "closed", decided_at: new Date().toISOString() }).eq("id", p.id);
    return result(who, "찬성을 취소했어요.");
  }
  await admin.from("room_votes").insert({ proposal_id: p.id, student_id: who.userId });
  const after = await result(who, "찬성했다!");
  if ("room" in after && !after.room.proposals.some((x) => x.id === p.id)) {
    after.message = `찬성이 모여서 ${roomItem(p.itemId)?.name}을(를) 샀다! 미니룸을 봐요!`;
  }
  return after;
}
