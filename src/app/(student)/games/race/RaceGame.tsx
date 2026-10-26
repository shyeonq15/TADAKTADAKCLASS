"use client";

import { useCallback, useEffect, useState } from "react";
import { GAME_COINS, RACE, TRACK_LABELS, TRACKS, type RaceDifficulty, type Track } from "@/config/game";
import { raceCreate, raceInfo, raceJoin, raceLeave, raceStart, raceSubmit } from "@/app/(student)/actions";
import { DialogBox } from "@/components/ui/DialogBox";
import { MissionLabel } from "@/components/ui/MissionLabel";
import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { TierBadge } from "@/components/ui/TierBadge";
import { RaceLanes, type Lane } from "@/components/typing/RaceLanes";
import { Minimi } from "@/components/pixel/Minimi";
import { TypingSession } from "@/components/typing/TypingSession";
import type { RaceInfo, RaceResult } from "@/lib/games/race";
import { useLobby, useRoom, type Me } from "@/lib/games/realtime";
import { safeCall } from "@/lib/practice/call";
import { useSetPracticeData } from "@/lib/practice/store";
import { toSubmission } from "@/lib/practice/submission";

const DIFFICULTY_LABELS: Record<RaceDifficulty, string> = { easy: "쉬움 (낱말)", normal: "보통 (문장)", hard: "어려움 (긴 글)" };

type Phase =
  | { name: "lobby" }
  | { name: "room"; matchId: string; host: boolean }
  | { name: "countdown"; matchId: string; info: RaceInfo; until: number }
  | { name: "racing"; matchId: string; info: RaceInfo }
  | { name: "result"; matchId: string; mine: RaceResult | null }
  | { name: "error"; message: string };

const fmt = (ms: number | null) => (ms === null ? "-" : `${(ms / 1000).toFixed(1)}초`);

/** 숫자가 줄어드는 카운트다운 */
function Countdown({ until, onDone }: { until: number; onDone: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (now >= until) {
      onDone();
      return;
    }
    const id = window.setTimeout(() => setNow(Date.now()), 100);
    return () => window.clearTimeout(id);
  }, [now, until, onDone]);
  const n = Math.ceil((until - now) / 1000);
  return (
    <div className="flex flex-col items-center gap-4 bg-navy-900 px-6 py-16">
      <MissionLabel keyword="MISSION">친구들과 같은 글로 레이스!</MissionLabel>
      <p className="font-title text-[96px] leading-none text-yellow-400">{n > 0 ? n : "GO!"}</p>
    </div>
  );
}

export function RaceGame({ me }: { me: Me }) {
  const setData = useSetPracticeData();
  const [phase, setPhase] = useState<Phase>({ name: "lobby" });
  const [track, setTrack] = useState<Track>("korean");
  const [difficulty, setDifficulty] = useState<RaceDifficulty>("normal");
  const [invited, setInvited] = useState<string[]>([]);
  const [results, setResults] = useState<RaceInfo | null>(null);
  const matchId = phase.name === "lobby" || phase.name === "error" ? null : phase.matchId;
  // 레이스 중 이모티콘 말풍선을 1.5초 뒤 지우려고 쓰는 시계
  const [now, setNow] = useState(0);
  const racing = phase.name === "racing";
  useEffect(() => {
    if (!racing) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [racing]);

  const lobby = useLobby(me, phase.name !== "lobby");

  // 시작 신호를 받으면: 서버에서 지문·표를 받아 카운트다운
  const onStart = useCallback(
    async (startAt: number) => {
      if (!matchId) return;
      const info = await safeCall(() => raceInfo(matchId));
      if ("error" in info || !info.lines) return;
      const wait = Math.min(Math.max(startAt - Date.now(), 1000), RACE.countdownMs + 1000);
      setPhase((p) => (p.name === "room" ? { name: "countdown", matchId, info, until: Date.now() + wait } : p));
    },
    [matchId],
  );
  const room = useRoom(matchId, me, onStart);

  // 대기방: 시작 신호를 놓쳤을 때를 위해 2초마다 서버 확인
  useEffect(() => {
    if (phase.name !== "room") return;
    const id = window.setInterval(async () => {
      const info = await safeCall(() => raceInfo(phase.matchId));
      if ("error" in info) return;
      if (info.status === "void") setPhase({ name: "error", message: "방장이 방을 나가서 대결이 취소됐어요." });
      else if (info.status === "playing" && info.startAt) void onStart(info.startAt);
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, onStart]);

  // 결과: 친구들이 다 칠 때까지 1.5초마다 순위 새로 받기
  useEffect(() => {
    if (phase.name !== "result") return;
    let stop = false;
    const tick = async () => {
      const info = await safeCall(() => raceInfo(phase.matchId));
      if (!stop && !("error" in info)) setResults(info);
    };
    void tick();
    const id = window.setInterval(tick, 1500);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [phase]);

  const create = async () => {
    const res = await safeCall(() => raceCreate(track, difficulty));
    if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
    setInvited([]);
    setPhase({ name: "room", matchId: res.matchId, host: true });
  };

  const accept = async () => {
    const inv = lobby.invite;
    lobby.clearInvite();
    if (!inv) return;
    const res = await safeCall(() => raceJoin(inv.matchId));
    if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
    setPhase({ name: "room", matchId: inv.matchId, host: false });
  };

  const leave = async () => {
    if (matchId && phase.name === "room") await safeCall(() => raceLeave(matchId));
    setResults(null);
    setPhase({ name: "lobby" });
  };

  const start = async () => {
    if (phase.name !== "room") return;
    const res = await safeCall(() => raceStart(phase.matchId));
    if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
    room.sendStart(res.startAt);
    void onStart(res.startAt);
  };

  const inviteModal =
    lobby.invite && phase.name === "lobby" ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 p-4">
        <RetroWindow title="대결 신청" className="w-full max-w-sm">
          <p className="font-pixel text-body">
            <strong>{lobby.invite.from}</strong>님이 {TRACK_LABELS[lobby.invite.track as Track] ?? ""} 대결을 신청했어요! 받을까요?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <PixelButton size="sm" variant="ghost" onClick={lobby.clearInvite}>
              다음에
            </PixelButton>
            <PixelButton size="sm" variant="success" autoFocus onClick={accept}>
              받기
            </PixelButton>
          </div>
        </RetroWindow>
      </div>
    ) : null;

  /* ───────── 로비 ───────── */
  if (phase.name === "lobby") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {inviteModal}
        <div className="text-center">
          <p className="title-lime text-hero">친구 대결</p>
          <p className="font-pixel text-body text-navy-900">우리 반 친구와 같은 글로 레이스! 이모티콘으로 응원해요 (채팅은 없어요)</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <RetroWindow title="방 만들기">
            <div className="flex flex-col gap-3 font-pixel text-body">
              <div className="flex flex-wrap gap-1">
                {TRACKS.map((t) => (
                  <button key={t} type="button" onClick={() => setTrack(t)} className={`win-bevel h-10 px-3 ${track === t ? "win-bevel-pressed bg-paper font-bold" : ""}`}>
                    {TRACK_LABELS[t]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(DIFFICULTY_LABELS) as RaceDifficulty[]).map((d) => (
                  <button key={d} type="button" onClick={() => setDifficulty(d)} className={`win-bevel h-10 px-3 text-small ${difficulty === d ? "win-bevel-pressed bg-paper font-bold" : ""}`}>
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
              <PixelButton variant="success" onClick={create} disabled={!lobby.connected}>
                ▶ 방 만들기
              </PixelButton>
              <p className="text-small text-text-muted">
                방을 만들면 접속한 친구에게 신청을 보낼 수 있어요 (최대 {RACE.maxPlayers}명). 1등은 코인 {GAME_COINS.raceWin}개!
              </p>
            </div>
          </RetroWindow>
          <RetroWindow title={`지금 접속한 우리 반 친구 (${lobby.online.length})`}>
            {!lobby.connected ? (
              <p className="font-pixel text-body">연결하는 중...</p>
            ) : lobby.online.length ? (
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {lobby.online.map((o) => (
                  <li key={o.userId} className="flex items-center gap-2 font-pixel text-body">
                    <TierBadge tier={o.tier} />
                    <span className="flex-1">{o.nickname}</span>
                    {o.busy && <span className="text-small text-text-muted">대결 중</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-pixel text-body">아직 접속한 친구가 없어요. 친구가 이 화면을 열면 여기에 보여요.</p>
            )}
          </RetroWindow>
        </div>
      </div>
    );
  }

  if (phase.name === "error") {
    return (
      <RetroWindow title="앗!" className="mx-auto w-full max-w-md">
        <p className="font-pixel text-body">{phase.message}</p>
        <PixelButton size="sm" variant="success" className="mt-4" autoFocus onClick={() => setPhase({ name: "lobby" })}>
          로비로
        </PixelButton>
      </RetroWindow>
    );
  }

  /* ───────── 대기방 ───────── */
  if (phase.name === "room") {
    const inRoom = Object.values(room.peers).filter((p) => !p.left);
    const canInvite = lobby.online.filter((o) => !o.busy && !inRoom.some((p) => p.userId === o.userId));
    return (
      <div className="mx-auto grid w-full max-w-4xl gap-4 md:grid-cols-2">
        <RetroWindow title={`대결방 (${inRoom.length} / ${RACE.maxPlayers})`}>
          <ul className="flex flex-col gap-2 font-pixel text-body">
            {inRoom.map((p) => (
              <li key={p.userId} className="win-bevel-pressed flex items-center gap-2 bg-paper px-3 py-2">
                {p.userId === me.userId ? "▶ " : ""}
                {p.nickname}
                {phase.host && p.userId === me.userId && <span className="ml-auto text-small">👑 방장</span>}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-2">
            {phase.host ? (
              <PixelButton variant="success" onClick={start} disabled={inRoom.length < 2}>
                ▶ 시작 ({inRoom.length < 2 ? "친구를 기다려요" : `${inRoom.length}명`})
              </PixelButton>
            ) : (
              <p className="font-pixel text-body">방장이 시작하기를 기다리는 중...</p>
            )}
            <PixelButton variant="ghost" size="sm" onClick={leave}>
              나가기
            </PixelButton>
          </div>
        </RetroWindow>
        {phase.host && (
          <RetroWindow title="대결 신청 보내기">
            {canInvite.length ? (
              <ul className="flex flex-col gap-1">
                {canInvite.map((o) => (
                  <li key={o.userId} className="flex items-center gap-2 font-pixel text-body">
                    <TierBadge tier={o.tier} />
                    <span className="flex-1">{o.nickname}</span>
                    <button
                      type="button"
                      disabled={invited.includes(o.userId) || inRoom.length >= RACE.maxPlayers}
                      onClick={() => {
                        lobby.sendInvite(phase.matchId, [o.userId], track);
                        setInvited((v) => [...v, o.userId]);
                      }}
                      className="win-bevel h-8 px-3 text-small active:win-bevel-pressed disabled:opacity-50"
                    >
                      {invited.includes(o.userId) ? "보냄" : "신청"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-pixel text-body">신청할 수 있는 친구가 없어요. 친구가 게임 → 친구 대결 화면을 열면 보여요.</p>
            )}
          </RetroWindow>
        )}
      </div>
    );
  }

  if (phase.name === "countdown") {
    const { info, until, matchId: id } = phase;
    return (
      <RetroWindow title={`친구 대결 - ${TRACK_LABELS[info.track]}`} className="mx-auto w-full max-w-4xl">
        <Countdown until={until} onDone={() => setPhase({ name: "racing", matchId: id, info })} />
      </RetroWindow>
    );
  }

  /* ───────── 레이스 ───────── */
  if (phase.name === "racing") {
    const { info, matchId: id } = phase;
    const lines = info.lines!;
    const total = lines.reduce((n, l) => n + l.length, 0);
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
        <div className="flex items-center justify-end gap-1">
          <span className="mr-2 font-pixel text-small text-navy-900">응원하기</span>
          {RACE.emojis.map((e) => (
            <button
              key={e}
              type="button"
              // 타자 칸에서 포커스가 빠지지 않게
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => room.sendEmoji(e)}
              className="win-bevel h-9 w-10 text-heading active:win-bevel-pressed"
              aria-label={`이모티콘 ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
        <RetroWindow title={`친구 대결 - ${TRACK_LABELS[info.track]}`}>
          <TypingSession
            lines={lines}
            track={info.track}
            header={(stats) => {
              const lanes: Lane[] = Object.values(room.peers)
                .filter((p) => p.userId !== me.userId)
                .map((p) => ({
                  id: p.userId,
                  name: p.nickname,
                  progress: p.progress,
                  look: info.players.find((pl) => pl.studentId === p.userId)?.look,
                  bubble: p.bubbleAt && now - p.bubbleAt < 1500 ? p.bubble : undefined,
                  badge: p.left ? "나감" : undefined,
                }));
              const mine = room.peers[me.userId];
              lanes.unshift({
                id: me.userId,
                name: me.nickname,
                progress: stats.progress,
                me: true,
                look: info.players.find((pl) => pl.studentId === me.userId)?.look,
                bubble: mine?.bubbleAt && now - mine.bubbleAt < 1500 ? mine.bubble : undefined,
              });
              return <RaceLanes lanes={lanes} />;
            }}
            onProgress={(done) => room.sendProgress(done / total)}
            onFinish={async (r) => {
              room.sendProgress(r.state.doneLines.reduce((n, l) => n + l.length, 0) / total, true);
              const res = await safeCall(() => raceSubmit(toSubmission(info.token!, lines, r)));
              if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
              setData(res.data);
              setPhase({ name: "result", matchId: id, mine: res.result });
            }}
          />
        </RetroWindow>
      </div>
    );
  }

  /* ───────── 결과 ───────── */
  const mine = phase.mine;
  const players = results?.players ?? [];
  const ranked = [...players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || (a.finishedMs ?? 1e9) - (b.finishedMs ?? 1e9));
  const message = [
    mine?.rank === 1 ? "1등으로 결승선을 통과했다!" : mine?.rank ? `${mine.rank}등으로 들어왔다!` : "끝까지 쳤다! 다음엔 더!",
    mine && mine.coins > 0 ? `코인 ${mine.coins}개를 획득했다!` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <p className="title-lime text-center text-hero">{mine?.rank === 1 ? "WIN!" : "FINISH!"}</p>
      {!mine?.rank && mine && (
        <p className="text-center font-pixel text-body text-navy-900">
          {!mine.completed ? "끝까지 다 쳐야 순위에 들어가요." : `정확도 ${RACE.minAccuracy}% 이상이어야 순위에 들어가요.`}
        </p>
      )}
      <DialogBox key={message} text={message} />
      <RetroWindow title="순위">
        <table className="w-full font-pixel text-body">
          <tbody>
            {ranked.map((p) => (
              <tr key={p.studentId} className={`border-b border-win-shadow ${p.studentId === me.userId ? "font-bold" : ""}`}>
                <td className="w-12 py-1 font-title text-heading">{p.rank ? `${p.rank}등` : "-"}</td>
                <td className="py-1">
                  <span className="flex items-center gap-2">
                    <Minimi look={p.look} scale={2} />
                    {p.nickname}
                  </span>
                </td>
                <td className="py-1 text-right">{p.finishedMs === null ? "치는 중..." : fmt(p.finishedMs)}</td>
                <td className="py-1 text-right">{p.cpm ? `${p.cpm}타` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 font-pixel text-small text-text-muted">순위는 서버가 결과를 받은 순서로 정해요. 끝까지 정확하게 친 사람만 순위에 들어가요.</p>
      </RetroWindow>
      <div className="flex justify-center gap-3">
        <PixelButton variant="success" autoFocus onClick={leave}>
          로비로
        </PixelButton>
        <PixelLink href="/games" variant="ghost">
          게임 목록
        </PixelLink>
      </div>
    </div>
  );
}
