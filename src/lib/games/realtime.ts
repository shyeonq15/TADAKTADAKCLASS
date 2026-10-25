"use client";

// 친구 대결 실시간 연결 (Supabase Realtime: presence + broadcast)
//  · 로비 채널: 우리 반에서 지금 접속한 친구 목록, 대결 신청 주고받기
//  · 방 채널: 시작 신호, 진행률(0.2초마다), 이모티콘
// 순위·시작 시각 같은 중요한 값은 서버가 정하고, 여기서는 화면에 보여 줄 것만 주고받아요.

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Tier } from "@/config/game";
import { createClient } from "@/lib/supabase/client";

export type Me = { userId: string; nickname: string; classId: string; tier: Tier };
export type Online = { userId: string; nickname: string; tier: Tier; busy: boolean };
export type Invite = { matchId: string; from: string; fromId: string; track: string };

type PresenceMeta = { userId: string; nickname: string; tier: Tier; busy?: boolean };

function onlineList(ch: RealtimeChannel, myId: string): Online[] {
  const state = ch.presenceState<PresenceMeta>();
  const seen = new Map<string, Online>();
  for (const metas of Object.values(state)) {
    for (const m of metas) {
      if (m.userId !== myId) seen.set(m.userId, { userId: m.userId, nickname: m.nickname, tier: m.tier, busy: !!m.busy });
    }
  }
  return [...seen.values()].sort((a, b) => a.nickname.localeCompare(b.nickname));
}

/** 우리 반 로비: 접속한 친구 목록 + 대결 신청 */
export function useLobby(me: Me, busy: boolean) {
  const [online, setOnline] = useState<Online[]>([]);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [connected, setConnected] = useState(false);
  const chRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`tadak-lobby-${me.classId}`, { config: { presence: { key: me.userId } } });
    chRef.current = ch;
    ch.on("presence", { event: "sync" }, () => setOnline(onlineList(ch, me.userId)))
      .on("broadcast", { event: "invite" }, ({ payload }) => {
        const p = payload as Invite & { to: string[] };
        if (p.to.includes(me.userId)) setInvite({ matchId: p.matchId, from: p.from, fromId: p.fromId, track: p.track });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setConnected(true);
          await ch.track({ userId: me.userId, nickname: me.nickname, tier: me.tier, busy: false } satisfies PresenceMeta);
        }
      });
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [me.classId, me.userId, me.nickname, me.tier]);

  // 방에 들어가 있으면 "대결 중"으로 표시
  useEffect(() => {
    if (connected) void chRef.current?.track({ userId: me.userId, nickname: me.nickname, tier: me.tier, busy } satisfies PresenceMeta);
  }, [busy, connected, me.userId, me.nickname, me.tier]);

  const sendInvite = (matchId: string, to: string[], track: string) =>
    chRef.current?.send({ type: "broadcast", event: "invite", payload: { matchId, to, from: me.nickname, fromId: me.userId, track } });

  return { online, invite, clearInvite: () => setInvite(null), sendInvite, connected };
}

export type RoomPeer = { userId: string; nickname: string; progress: number; bubble?: string; bubbleAt?: number; left?: boolean };

/** 대결 방: 참가자 목록, 시작 신호, 진행률, 이모티콘 */
export function useRoom(matchId: string | null, me: Me, onStart: (startAt: number) => void) {
  const [peers, setPeers] = useState<Record<string, RoomPeer>>({});
  const chRef = useRef<RealtimeChannel | null>(null);
  const onStartRef = useRef(onStart);
  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    if (!matchId) return;
    const supabase = createClient();
    const ch = supabase.channel(`tadak-race-${matchId}`, { config: { presence: { key: me.userId }, broadcast: { self: false } } });
    chRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const here = new Set(onlineList(ch, "").map((o) => o.userId));
      setPeers((prev) => {
        const next: Record<string, RoomPeer> = {};
        for (const o of onlineList(ch, "")) next[o.userId] = { ...(prev[o.userId] ?? { progress: 0 }), userId: o.userId, nickname: o.nickname };
        // 나간 사람은 표시만 남김
        for (const [id, p] of Object.entries(prev)) if (!here.has(id)) next[id] = { ...p, left: true };
        return next;
      });
    })
      .on("broadcast", { event: "start" }, ({ payload }) => onStartRef.current((payload as { startAt: number }).startAt))
      .on("broadcast", { event: "progress" }, ({ payload }) => {
        const p = payload as { userId: string; progress: number };
        setPeers((prev) => (prev[p.userId] ? { ...prev, [p.userId]: { ...prev[p.userId], progress: p.progress } } : prev));
      })
      .on("broadcast", { event: "emoji" }, ({ payload }) => {
        const p = payload as { userId: string; emoji: string };
        setPeers((prev) => (prev[p.userId] ? { ...prev, [p.userId]: { ...prev[p.userId], bubble: p.emoji, bubbleAt: Date.now() } } : prev));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ userId: me.userId, nickname: me.nickname, tier: me.tier } satisfies PresenceMeta);
      });
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [matchId, me.userId, me.nickname, me.tier]);

  const lastSent = useRef(0);
  const sendProgress = (progress: number, force = false) => {
    const t = Date.now();
    if (!force && t - lastSent.current < 200) return;
    lastSent.current = t;
    void chRef.current?.send({ type: "broadcast", event: "progress", payload: { userId: me.userId, progress } });
  };
  const sendStart = (startAt: number) => chRef.current?.send({ type: "broadcast", event: "start", payload: { startAt } });
  const sendEmoji = (emoji: string) => {
    void chRef.current?.send({ type: "broadcast", event: "emoji", payload: { userId: me.userId, emoji } });
    setPeers((prev) => ({ ...prev, [me.userId]: { ...(prev[me.userId] ?? { userId: me.userId, nickname: me.nickname, progress: 0 }), bubble: emoji, bubbleAt: Date.now() } }));
  };

  return { peers, sendProgress, sendStart, sendEmoji };
}
