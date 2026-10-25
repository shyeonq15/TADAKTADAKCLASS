"use client";

import { useState } from "react";
import { Minimi } from "@/components/pixel/Minimi";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { COIN } from "@/components/pixel/sprites";
import { PixelButton } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { MINIMI_ITEMS, MINIMI_SLOTS, SLOT_LABELS, type MinimiItem, type MinimiLook, type MinimiSlot } from "@/config/shop";
import { safeCall } from "@/lib/practice/call";
import { usePracticeData, useSetPracticeData } from "@/lib/practice/store";
import { lockLabel, lockOpen } from "@/lib/shop/lock";
import type { ShopData } from "@/lib/shop/server";
import { shopBuy, shopEquip } from "../actions";

const sameLook = (a: MinimiLook, b: MinimiLook) => MINIMI_SLOTS.every((s) => (a[s] ?? null) === (b[s] ?? null));

export function ShopScreen({ initial }: { initial: ShopData }) {
  const { progress } = usePracticeData();
  const setData = useSetPracticeData();
  const [shop, setShop] = useState(initial);
  const [slot, setSlot] = useState<MinimiSlot>("hat");
  const [picked, setPicked] = useState<MinimiItem | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; good: boolean } | null>(null);

  // 고른 아이템을 입혀 본 모습 (아직 저장 안 함)
  const preview: MinimiLook = picked ? { ...shop.look, [picked.slot]: picked.id } : shop.look;
  const trying = !sameLook(preview, shop.look);

  const pick = (item: MinimiItem) => {
    setPicked(item);
    setConfirming(false);
    setMsg(null);
  };

  async function run(call: () => ReturnType<typeof shopBuy>, done: string) {
    setBusy(true);
    const res = await safeCall(call);
    setBusy(false);
    setConfirming(false);
    if ("error" in res) {
      setMsg({ text: res.error, good: false });
      return;
    }
    setShop(res.shop);
    setData(res.data);
    setPicked(null);
    setMsg({ text: done, good: true });
  }

  const owned = (id: string) => shop.owned.includes(id);
  // 털 색을 안 골랐으면 기본(크림)을 입은 것으로 봐요
  const worn = (item: MinimiItem) => shop.look[item.slot] === item.id || (item.slot === "fur" && !shop.look.fur && item.price === 0);

  return (
    <div className="grid gap-5 md:grid-cols-[300px_1fr]">
      <RetroWindow title="내 미니미">
        <div className="flex flex-col items-center gap-3">
          <div className="win-bevel-pressed flex w-full justify-center bg-paper py-4">
            <Minimi look={preview} scale={10} label="내 미니미" />
          </div>
          <p className="font-pixel text-small text-text-muted">{trying ? "입어 보는 중이에요 (아직 안 바뀌었어요)" : "지금 내 모습이에요"}</p>
          <p className="flex items-center gap-2 font-pixel text-body">
            <PixelSprite sprite={COIN} scale={2} /> 내 코인 <strong className="font-title text-heading">{progress.coins}</strong>
          </p>
          {trying && (
            <PixelButton variant="ghost" size="sm" onClick={() => setPicked(null)}>
              원래대로
            </PixelButton>
          )}
        </div>
      </RetroWindow>

      <RetroWindow title="상점.exe">
        {!shop.ready && (
          <p className="mb-3 border-2 border-navy-900 bg-paper p-2 font-pixel text-body font-bold">
            상점 준비가 아직 안 됐어요. 선생님이 데이터베이스 설정을 마치면 열려요.
          </p>
        )}
        <div role="tablist" className="flex gap-1">
          {MINIMI_SLOTS.map((s) => (
            <button
              key={s}
              role="tab"
              type="button"
              aria-selected={slot === s}
              onClick={() => setSlot(s)}
              className={`h-10 px-4 font-pixel text-body text-navy-900 ${slot === s ? "win-bevel font-bold" : "win-bevel-pressed bg-[#c4c0b8]"}`}
            >
              {SLOT_LABELS[s]}
            </button>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-2 border-t-2 border-win-shadow pt-3 sm:grid-cols-3 lg:grid-cols-4">
          {MINIMI_ITEMS.filter((i) => i.slot === slot).map((item) => {
            const open = lockOpen(item.lock, progress.unlocked);
            const isPicked = picked?.id === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => pick(item)}
                  aria-pressed={isPicked}
                  className={`flex w-full flex-col items-center gap-1 p-2 font-pixel text-small text-navy-900 ${isPicked ? "win-bevel-pressed bg-paper" : "win-bevel"} ${open ? "" : "opacity-60"}`}
                >
                  <Minimi look={{ ...shop.look, [item.slot]: item.id }} scale={4} />
                  <span className="font-bold">{item.name}</span>
                  {worn(item) ? (
                    <span className="bg-lime-400 px-1">입는 중</span>
                  ) : owned(item.id) ? (
                    <span className="border border-navy-900 px-1">가지고 있음</span>
                  ) : !open ? (
                    <span>🔒 잠김</span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <PixelSprite sprite={COIN} scale={1} /> {item.price}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 min-h-24 border-t-2 border-win-shadow pt-3 font-pixel text-body" aria-live="polite">
          {msg && <p className={`mb-2 font-bold ${msg.good ? "text-lime-800" : "text-navy-700"}`}>{msg.text}</p>}
          {picked && (
            <ItemActions
              item={picked}
              owned={owned(picked.id)}
              worn={worn(picked)}
              open={lockOpen(picked.lock, progress.unlocked)}
              coins={progress.coins}
              busy={busy || !shop.ready}
              confirming={confirming}
              onConfirm={() => setConfirming(true)}
              onCancel={() => setConfirming(false)}
              onBuy={() => run(() => shopBuy(picked.id), `${picked.name}을(를) 샀다! 바로 입었어요.`)}
              onWear={() => run(() => shopEquip(picked.slot, picked.id), `${picked.name}을(를) 입었다!`)}
              onTakeOff={() => run(() => shopEquip(picked.slot, null), `${picked.name}을(를) 벗었다!`)}
            />
          )}
          {!picked && !msg && <p className="text-text-muted">아이템을 누르면 미니미에게 입혀 볼 수 있어요.</p>}
        </div>
      </RetroWindow>
    </div>
  );
}

function ItemActions(p: {
  item: MinimiItem;
  owned: boolean;
  worn: boolean;
  open: boolean;
  coins: number;
  busy: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onBuy: () => void;
  onWear: () => void;
  onTakeOff: () => void;
}) {
  const { item } = p;
  if (p.worn) {
    return item.slot === "fur" ? (
      <p>지금 {item.name}예요.</p>
    ) : (
      <PixelButton variant="ghost" size="sm" disabled={p.busy} onClick={p.onTakeOff}>
        벗기
      </PixelButton>
    );
  }
  if (p.owned) {
    return (
      <PixelButton variant="success" size="sm" disabled={p.busy} onClick={p.onWear}>
        입기
      </PixelButton>
    );
  }
  if (!p.open && item.lock) return <p>🔒 {lockLabel(item.lock)}</p>;
  if (p.coins < item.price) {
    return (
      <p>
        {item.price}코인이 필요해요. {item.price - p.coins}코인만 더 모으면 돼요. 다음엔 더!
      </p>
    );
  }
  if (!p.confirming) {
    return (
      <PixelButton variant="reward" size="sm" disabled={p.busy} onClick={p.onConfirm}>
        {item.price}코인으로 사기
      </PixelButton>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>
        <strong>{item.name}</strong>을(를) {item.price}코인에 살까요?
      </span>
      <PixelButton variant="reward" size="sm" disabled={p.busy} onClick={p.onBuy}>
        {p.busy ? "사는 중…" : "살래요"}
      </PixelButton>
      <PixelButton variant="ghost" size="sm" disabled={p.busy} onClick={p.onCancel}>
        취소
      </PixelButton>
    </div>
  );
}
