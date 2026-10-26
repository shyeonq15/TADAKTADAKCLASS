"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GAME_COINS, RACE, RACE_MODE_LABELS, TRACK_LABELS, TRACKS, type RaceDifficulty, type RaceMode, type Track } from "@/config/game";
import { raceCreate, raceInfo, raceJoin, raceLeave, raceQueue, raceQueueLeave, raceStart, raceSubmit } from "@/app/(student)/actions";
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
  | { name: "queue"; track: Track; waitedSec: number; range: number | null }
  | { name: "room"; matchId: string; host: boolean }
  | { name: "countdown"; matchId: string; info: RaceInfo; until: number }
  | { name: "racing"; matchId: string; info: RaceInfo }
  | { name: "result"; matchId: string; info: RaceInfo; mine: RaceResult | null }
  | { name: "error"; message: string };

const fmt = (ms: number | null) => (ms === null ? "-" : `${(ms / 1000).toFixed(1)}초`);
const pct = (n: number | null) => (n === null ? "-" : `${n > 0 ? "+" : ""}${n}%`);
const dots = (wins: number) => "★".repeat(wins) + "☆".repeat(Math.max(0, RACE.winsNeeded - wins));

/** 숫자가 줄어드는 카운트다운 */
function Countdown({ until, round, onDone }: { until: number; round: number; onDone: () => void }) {
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
      <MissionLabel keyword="MISSION">{`${round}판! 친구들과 같은 글로 레이스!`}</MissionLabel>
      <p className="font-title text-[96px] leading-none text-yellow-400">{n > 0 ? n : "GO!"}</p>
    </div>
  );
}

/** 카운트다운까지 기다릴 시간 (내 시계가 조금 틀려도 너무 짧거나 길지 않게) */
const untilOf = (startAt: number) => Date.now() + Math.min(Math.max(startAt - Date.now(), 1000), RACE.countdownMs + RACE.queue.pollMs + 1000);

export function RaceGame({ me, rating }: { me: Me; rating: number }) {
  const setData = useSetPracticeData();
  const [phase, setPhase] = useState<Phase>({ name: "lobby" });
  const [track, setTrack] = useState<Track>("korean");
  const [difficulty, setDifficulty] = useState<RaceDifficulty>("normal");
  const [mode, setMode] = useState<RaceMode>("classic");
  const [invited, setInvited] = useState<string[]>([]);
  const [results, setResults] = useState<RaceInfo | null>(null);
  const [dropped, setDropped] = useState(false);
  const matchId = "matchId" in phase ? phase.matchId : null;
  // 같은 시리즈의 판들은 같은 실시간 채널을 써요 (방에서는 첫 판 id = 시리즈 id)
  const seriesId = "info" in phase ? phase.info.seriesId : phase.name === "room" ? phase.matchId : null;
  // 레이스 중 이모티콘 말풍선을 1.5초 뒤 지우려고 쓰는 시계
  const [now, setNow] = useState(0);
  const ticking = phase.name === "racing" || phase.name === "result";
  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [ticking]);

  const lobby = useLobby(me, phase.name !== "lobby" && phase.name !== "queue");

  /** 판 정보를 받아 카운트다운으로 */
  const goCountdown = useCallback(async (id: string) => {
    const info = await safeCall(() => raceInfo(id));
    if ("error" in info || !info.lines || !info.startAt) return false;
    setResults(null);
    setPhase({ name: "countdown", matchId: id, info, until: untilOf(info.startAt) });
    return true;
  }, []);

  // 방장의 시작 신호
  const onStart = useCallback(
    async () => {
      if (phase.name === "room") await goCountdown(phase.matchId);
    },
    [phase, goCountdown],
  );
  const room = useRoom(seriesId, me, onStart);

  // 대기방: 시작 신호를 놓쳤을 때를 위해 2초마다 서버 확인
  useEffect(() => {
    if (phase.name !== "room") return;
    const id = window.setInterval(async () => {
      const info = await safeCall(() => raceInfo(phase.matchId));
      if ("error" in info) return;
      if (info.status === "void") setPhase({ name: "error", message: "방장이 방을 나가서 대결이 취소됐어요." });
      else if (info.status === "playing" && info.startAt) void goCountdown(phase.matchId);
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, goCountdown]);

  // 자동 매치: 2초마다 짝을 찾아요
  const queueTrack = phase.name === "queue" ? phase.track : null;
  useEffect(() => {
    if (!queueTrack) return;
    let stop = false;
    const tick = async () => {
      const res = await safeCall(() => raceQueue(queueTrack));
      if (stop) return;
      if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
      if ("matchId" in res) {
        stop = true;
        if (!(await goCountdown(res.matchId))) setPhase({ name: "error", message: "짝은 찾았는데 대결을 열지 못했어요. 다시 해 주세요." });
        return;
      }
      setPhase((p) => (p.name === "queue" ? { ...p, waitedSec: res.waitedSec, range: res.range } : p));
    };
    void tick();
    const id = window.setInterval(tick, RACE.queue.pollMs);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [queueTrack, goCountdown]);

  // 결과: 친구들이 다 칠 때까지 순위를 새로 받고, 다음 판이 열리면 넘어가요
  const resultId = phase.name === "result" ? phase.matchId : null;
  const moving = useRef(false);
  useEffect(() => {
    if (!resultId) return;
    let stop = false;
    moving.current = false;
    const tick = async () => {
      const info = await safeCall(() => raceInfo(resultId));
      if (stop || "error" in info) return;
      setResults(info);
      if (info.next && !moving.current && Date.now() >= info.next.startAt - RACE.countdownMs - 300) {
        moving.current = true;
        if (!(await goCountdown(info.next.matchId))) setDropped(true);
      }
    };
    void tick();
    const id = window.setInterval(tick, 1000);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [resultId, goCountdown]);

  const create = async () => {
    const res = await safeCall(() => raceCreate(track, difficulty, mode));
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
    // 시리즈 중간에 나가면 다음 판에서 빠져요 (친구들이 기다리지 않게)
    if (phase.name === "result" && results?.next) await safeCall(() => raceLeave(results.next!.matchId));
    setResults(null);
    setDropped(false);
    setPhase({ name: "lobby" });
  };

  const cancelQueue = async () => {
    await safeCall(() => raceQueueLeave());
    setPhase({ name: "lobby" });
  };

  const start = async () => {
    if (phase.name !== "room") return;
    const res = await safeCall(() => raceStart(phase.matchId));
    if ("error" in res) return setPhase({ name: "error", message: res.error ?? "" });
    room.sendStart(res.startAt);
    void goCountdown(phase.matchId);
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

  const trackPicker = (
    <div className="flex flex-wrap gap-1">
      {TRACKS.map((t) => (
        <button key={t} type="button" onClick={() => setTrack(t)} className={`win-bevel h-10 px-3 ${track === t ? "win-bevel-pressed bg-paper font-bold" : ""}`}>
          {TRACK_LABELS[t]}
        </button>
      ))}
    </div>
  );

  /* ───────── 로비 ───────── */
  if (phase.name === "lobby") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        {inviteModal}
        <div className="text-center">
          <p className="title-lime text-hero">친구 대결</p>
          <p className="font-pixel text-body text-navy-900">
            우리 반 친구와 같은 글로 레이스! {RACE.maxRounds}판 {RACE.winsNeeded}선승 · 이모티콘으로 응원해요 (채팅은 없어요)
          </p>
          <p className="mt-1 font-pixel text-body text-navy-900">
            내 대결 레이팅 <strong className="font-title text-heading">{rating}</strong>
          </p>
        </div>
        <div className="font-pixel text-body">{trackPicker}</div>
        <div className="grid gap-4 md:grid-cols-3">
          <RetroWindow title="자동 매치">
            <div className="flex flex-col gap-3 font-pixel text-body">
              <p>레이팅이 비슷한 우리 반 친구와 1:1로 붙여 줘요. 오래 기다리면 범위를 넓혀요.</p>
              <PixelButton variant="reward" onClick={() => setPhase({ name: "queue", track, waitedSec: 0, range: RACE.queue.base })}>
                🔍 {TRACK_LABELS[track]} 대결 찾기
              </PixelButton>
              <p className="text-small text-text-muted">클래식 · 보통 난이도. 이기면 레이팅이 올라요.</p>
            </div>
          </RetroWindow>
          <RetroWindow title="방 만들기">
            <div className="flex flex-col gap-3 font-pixel text-body">
              <div className="flex flex-wrap gap-1">
                {(Object.keys(DIFFICULTY_LABELS) as RaceDifficulty[]).map((d) => (
                  <button key={d} type="button" onClick={() => setDifficulty(d)} className={`win-bevel h-9 px-2 text-small ${difficulty === d ? "win-bevel-pressed bg-paper font-bold" : ""}`}>
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {(Object.keys(RACE_MODE_LABELS) as RaceMode[]).map((md) => (
                  <button key={md} type="button" onClick={() => setMode(md)} className={`win-bevel h-9 px-2 text-small ${mode === md ? "win-bevel-pressed bg-paper font-bold" : ""}`}>
                    {RACE_MODE_LABELS[md]}
                  </button>
                ))}
              </div>
              <PixelButton variant="success" onClick={create} disabled={!lobby.connected}>
                ▶ 방 만들기
              </PixelButton>
              <p className="text-small text-text-muted">
                {mode === "growth"
                  ? "성장 모드는 내 최근 기록보다 가장 많이 잘 친 사람이 이겨요. 레이팅에는 안 들어가요."
                  : `먼저 끝까지 친 사람이 이겨요. 최대 ${RACE.maxPlayers}명.`}{" "}
                우승은 코인 {GAME_COINS.raceWin}개!
              </p>
            </div>
          </RetroWindow>
          <RetroWindow title={`접속한 우리 반 친구 (${lobby.online.length})`}>
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

  /* ───────── 자동 매치 기다리기 ───────── */
  if (phase.name === "queue") {
    return (
      <RetroWindow title="자동 매치" className="mx-auto w-full max-w-md">
        <div className="flex flex-col items-center gap-3 py-6 font-pixel text-body text-navy-900">
          <p className="font-title text-heading">🔍 {TRACK_LABELS[phase.track]} 상대를 찾는 중…</p>
          <p>
            {phase.waitedSec}초 · {phase.range === null ? "누구와도 붙어요" : `레이팅 ${rating} ± ${phase.range}`}
          </p>
          <p className="text-small text-text-muted">같은 반 친구가 같은 트랙으로 대결 찾기를 누르면 바로 시작해요.</p>
          <PixelButton variant="ghost" size="sm" onClick={cancelQueue}>
            그만 찾기
          </PixelButton>
        </div>
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
        <Countdown until={until} round={info.round} onDone={() => setPhase({ name: "racing", matchId: id, info })} />
      </RetroWindow>
    );
  }

  /* ───────── 레이스 ───────── */
  if (phase.name === "racing") {
    const { info, matchId: id } = phase;
    const lines = info.lines!;
    const total = lines.reduce((n, l) => n + l.length, 0);
    const winsOf = (sid: string) => info.players.find((pl) => pl.studentId === sid)?.wins ?? 0;
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
        <div className="flex items-center gap-1">
          <span className="font-pixel text-body font-bold text-navy-900">
            {info.round}판 · {RACE.winsNeeded}승 먼저! {info.mode === "growth" ? "· 성장 모드" : ""}
          </span>
          <span className="ml-auto mr-2 font-pixel text-small text-navy-900">응원하기</span>
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
                .filter((p) => p.userId !== me.userId && info.players.some((pl) => pl.studentId === p.userId))
                .map((p) => ({
                  id: p.userId,
                  name: `${p.nickname} ${"★".repeat(winsOf(p.userId))}`,
                  progress: p.progress,
                  look: info.players.find((pl) => pl.studentId === p.userId)?.look,
                  bubble: p.bubbleAt && now - p.bubbleAt < 1500 ? p.bubble : undefined,
                  badge: p.left ? "나감" : undefined,
                }));
              const mine = room.peers[me.userId];
              lanes.unshift({
                id: me.userId,
                name: `${me.nickname} ${"★".repeat(winsOf(me.userId))}`,
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
              setPhase({ name: "result", matchId: id, info, mine: res.result });
            }}
          />
        </RetroWindow>
      </div>
    );
  }

  /* ───────── 결과 ───────── */
  const view = results ?? phase.info;
  const mine = phase.mine;
  const meRow = view.players.find((p) => p.studentId === me.userId);
  const myRank = meRow?.rank ?? mine?.rank ?? null;
  const allIn = view.players.every((p) => p.finishedMs !== null);
  const growth = view.mode === "growth";
  const ranked = [...view.players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || (a.finishedMs ?? 1e9) - (b.finishedMs ?? 1e9));
  const standings = [...view.players].sort((a, b) => b.wins - a.wins);
  const champion = view.seriesDone ? standings[0] : null;
  const iWon = champion?.studentId === me.userId && champion.wins > 0;
  const nextIn = view.next ? Math.max(0, Math.ceil((view.next.startAt - RACE.countdownMs - now) / 1000)) : null;

  const message = [
    view.seriesDone
      ? iWon
        ? "시리즈 우승했다!"
        : `${champion?.nickname ?? "친구"}의 우승! 다음엔 더!`
      : myRank === 1
        ? `${view.round}판을 이겼다!`
        : myRank
          ? `${view.round}판 ${myRank}등으로 들어왔다!`
          : allIn || !growth
            ? "끝까지 쳤다! 다음엔 더!"
            : "다 쳤다! 친구들을 기다리는 중…",
    mine && mine.coins > 0 ? `코인 ${mine.coins}개를 획득했다!` : "",
    view.seriesDone && iWon ? `우승 코인 ${GAME_COINS.raceWin}개도 받았다!` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <p className="title-lime text-center text-hero">{view.seriesDone ? (iWon ? "CHAMPION!" : "GAME SET!") : `ROUND ${view.round}`}</p>
      {mine && !mine.rank && !growth && (
        <p className="text-center font-pixel text-body text-navy-900">
          {!mine.completed ? "끝까지 다 쳐야 순위에 들어가요." : `정확도 ${RACE.minAccuracy}% 이상이어야 순위에 들어가요.`}
        </p>
      )}
      <DialogBox key={message} text={message} />

      <RetroWindow title={`${view.round}판 순위${growth ? " (성장 모드)" : ""}`}>
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
                {growth && <td className="py-1 text-right">{pct(p.growthPct)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 font-pixel text-small text-text-muted">
          {growth
            ? "성장 모드: 내 최근 5번 기록의 중앙값보다 몇 % 잘 쳤는지로 순위를 정해요. 다 친 뒤에 순위가 나와요."
            : "순위는 서버가 결과를 받은 순서로 정해요. 끝까지 정확하게 친 사람만 순위에 들어가요."}
        </p>
      </RetroWindow>

      <RetroWindow title={`시리즈 (${RACE.maxRounds}판 ${RACE.winsNeeded}선승)`}>
        <ul className="flex flex-col gap-1 font-pixel text-body">
          {standings.map((p) => (
            <li key={p.studentId} className={`flex items-center gap-2 ${p.studentId === me.userId ? "font-bold" : ""}`}>
              <span className="flex-1">{p.nickname}</span>
              <span className="text-yellow-600" aria-label={`${p.wins}승`}>
                {dots(p.wins)}
              </span>
              {view.seriesDone && p.ratingDelta !== null && (
                <span className="w-28 text-right text-small">
                  레이팅 {p.rating} ({p.ratingDelta >= 0 ? "+" : ""}
                  {p.ratingDelta})
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-pixel text-small text-navy-900">
          {view.seriesDone
            ? "시리즈가 끝났어요!"
            : dropped
              ? "이번 판을 끝내지 못해서 이번 시리즈는 여기까지예요."
              : nextIn !== null
                ? `다음 판이 ${nextIn}초 뒤에 시작돼요!`
                : allIn
                  ? "다음 판을 준비하는 중…"
                  : `친구들이 치는 중… (최대 ${RACE.roundMaxMs / 1000}초)`}
        </p>
      </RetroWindow>

      <div className="flex justify-center gap-3">
        <PixelButton variant={view.seriesDone || dropped ? "success" : "ghost"} autoFocus={view.seriesDone} onClick={leave}>
          {view.seriesDone || dropped ? "로비로" : "그만하고 로비로"}
        </PixelButton>
        <PixelLink href="/games" variant="ghost">
          게임 목록
        </PixelLink>
      </div>
    </div>
  );
}
