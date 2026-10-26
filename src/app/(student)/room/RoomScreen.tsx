"use client";

import { useState } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { ROOM_ART, ROOM_SURFACES } from "@/components/pixel/roomArt";
import { COIN } from "@/components/pixel/sprites";
import { ClassRoom } from "@/components/room/ClassRoom";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { ROOM, ROOM_ITEMS, roomItem, type RoomItem } from "@/config/shop";
import { safeCall } from "@/lib/practice/call";
import type { RoomData, RoomProposal } from "@/lib/room/server";
import { roomPropose, roomVote } from "../actions";

const KINDS = [
  ["furniture", "가구"],
  ["wall", "벽지"],
  ["floor", "바닥"],
] as const;

export function RoomScreen({ initial }: { initial: RoomData }) {
  const [room, setRoom] = useState(initial);
  const [kind, setKind] = useState<RoomItem["kind"]>("furniture");
  const [picked, setPicked] = useState<RoomItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);

  const done = room.members.filter((m) => m.doneToday).length;
  const has = (item: RoomItem) => room.furniture.includes(item.id) || room.wall === item.id || room.floor === item.id;
  const proposed = (item: RoomItem) => room.proposals.some((p) => p.itemId === item.id);
  const price = (item: RoomItem) => (item.kind !== "furniture" && room.ownedSurfaces.includes(item.id) ? 0 : item.price);

  async function run(call: () => ReturnType<typeof roomVote>) {
    setBusy(true);
    const res = await safeCall(call);
    setBusy(false);
    if ("error" in res) {
      setMsg({ text: res.error, good: false });
      return;
    }
    setRoom(res.room);
    setPicked(null);
    setMsg({ text: res.message, good: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <RetroWindow title="우리반_미니룸.exe">
        {!room.ready && (
          <p className="mb-3 border-2 border-navy-900 bg-paper p-2 font-pixel text-body font-bold">
            미니룸 준비가 아직 안 됐어요. 선생님이 데이터베이스 설정을 마치면 열려요.
          </p>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-pixel text-body text-navy-900">
          <span className="flex items-center gap-1">
            <PixelSprite sprite={COIN} scale={2} /> 반 지갑 <strong className="font-title text-heading">{room.classCoins}</strong>
          </span>
          <span>
            오늘 미션 완료 <strong className="font-title text-heading">{done}</strong> / {room.members.length}명 ✨
          </span>
          {picked && <span className="ml-auto font-bold text-navy-700">입혀 보는 중: {picked.name}</span>}
        </div>
        <ClassRoom
          wall={room.wall}
          floor={room.floor}
          furniture={room.furniture}
          members={room.members}
          meId={room.meId}
          preview={picked?.id}
        />
        <p className="mt-2 font-pixel text-small text-text-muted">
          미니미에 마우스를 올리면 친구 닉네임이 보여요. 반짝이는 친구는 오늘의 미션을 끝냈어요!
        </p>
      </RetroWindow>

      {msg && (
        <p
          aria-live="polite"
          className={`border-2 border-navy-900 bg-paper px-3 py-2 font-pixel text-body font-bold ${msg.good ? "text-lime-800" : "text-navy-700"}`}
        >
          {msg.text}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <RetroWindow title="투표판">
          <p className="mb-3 font-pixel text-small text-text-muted">
            반 친구 <strong>{room.need}명</strong>이 찬성하면 반 지갑으로 사서 미니룸에 놓아요. 추천은 한 사람당 {ROOM.maxOpenPerStudent}개까지예요.
          </p>
          {room.proposals.length === 0 ? (
            <p className="font-pixel text-body">아직 추천이 없어요. 오른쪽에서 갖고 싶은 걸 골라 추천해 봐요!</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {room.proposals.map((p) => (
                <ProposalRow
                  key={p.id}
                  p={p}
                  need={room.need}
                  coins={room.classCoins}
                  price={price(roomItem(p.itemId)!)}
                  busy={busy || !room.ready}
                  onVote={() => run(() => roomVote(p.id))}
                />
              ))}
            </ul>
          )}
        </RetroWindow>

        <RetroWindow title="가구 고르기">
          <div role="tablist" className="flex gap-1">
            {KINDS.map(([k, label]) => (
              <button
                key={k}
                role="tab"
                type="button"
                aria-selected={kind === k}
                onClick={() => setKind(k)}
                className={`h-10 px-4 font-pixel text-body text-navy-900 ${kind === k ? "win-bevel font-bold" : "win-bevel-pressed bg-[#c4c0b8]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <ul className="grid grid-cols-3 gap-2 border-t-2 border-win-shadow pt-3">
            {ROOM_ITEMS.filter((i) => i.kind === kind).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={picked?.id === item.id}
                  onClick={() => {
                    setPicked(picked?.id === item.id ? null : item);
                    setMsg(null);
                  }}
                  className={`flex w-full flex-col items-center gap-1 p-2 font-pixel text-small text-navy-900 ${picked?.id === item.id ? "win-bevel-pressed bg-paper" : "win-bevel"}`}
                >
                  <ItemIcon item={item} />
                  <span className="font-bold">{item.name}</span>
                  {has(item) ? (
                    <span className="bg-lime-400 px-1">우리 반에 있음</span>
                  ) : proposed(item) ? (
                    <span className="border border-navy-900 px-1">투표 중</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <PixelSprite sprite={COIN} scale={1} /> {price(item) || "무료"}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 min-h-12 border-t-2 border-win-shadow pt-3 font-pixel text-body">
            {!picked ? (
              <p className="text-text-muted">고르면 위 미니룸에 미리 놓아 볼 수 있어요.</p>
            ) : has(picked) ? (
              <p>{picked.name}은(는) 이미 우리 반 미니룸에 있어요.</p>
            ) : proposed(picked) ? (
              <p>누가 벌써 추천했어요! 왼쪽 투표판에서 찬성을 눌러 주세요.</p>
            ) : (
              <PixelButton variant="reward" size="sm" disabled={busy || !room.ready} onClick={() => run(() => roomPropose(picked.id))}>
                {picked.name} 사자고 추천하기
              </PixelButton>
            )}
          </div>
        </RetroWindow>
      </div>
    </div>
  );
}

function ProposalRow({
  p,
  need,
  coins,
  price,
  busy,
  onVote,
}: {
  p: RoomProposal;
  need: number;
  coins: number;
  price: number;
  busy: boolean;
  onVote: () => void;
}) {
  const item = roomItem(p.itemId)!;
  const enough = p.votes >= need;
  return (
    <li className="win-bevel-pressed flex items-center gap-3 bg-paper p-2 font-pixel text-small text-navy-900">
      <ItemIcon item={item} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-bold">
          {item.name} <span className="font-normal">· {price ? `${price}코인` : "무료"}</span>
        </p>
        <p className="text-text-muted">{p.proposer}의 추천</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-4 flex-1 border-2 border-navy-900 bg-cream">
            <div className="h-full bg-lime-400" style={{ width: `${Math.min(100, (p.votes / need) * 100)}%` }} />
          </div>
          <span className="shrink-0 font-bold">
            찬성 {p.votes}/{need}
          </span>
        </div>
        {enough && coins < price && <p className="mt-1 font-bold">찬성 완료! 반 지갑에 {price - coins}코인이 더 모이면 바로 사요.</p>}
      </div>
      <PixelButton variant={p.iVoted ? "ghost" : "success"} size="sm" disabled={busy} onClick={onVote}>
        {p.iVoted ? "찬성 취소" : "찬성"}
      </PixelButton>
    </li>
  );
}

function ItemIcon({ item }: { item: RoomItem }) {
  if (item.kind !== "furniture") {
    return <span aria-hidden className="block h-12 w-12 shrink-0 border-2 border-navy-900" style={ROOM_SURFACES[item.art]} />;
  }
  const art = ROOM_ART[item.art];
  const w = Math.max(...art.rows.map((r) => r.length));
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center">
      <PixelSprite sprite={art} scale={w > 24 ? 1 : 2} />
    </span>
  );
}
