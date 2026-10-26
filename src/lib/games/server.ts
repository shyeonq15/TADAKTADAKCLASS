import "server-only";

// 혼자 하는 게임 저장 (서버 전용). 연습과 같이: 서버가 판을 발급 → 화면이 놀고 → 서버가 점수를 다시 계산해 저장

import { randomInt } from "node:crypto";
import { GAME_COINS, GAME_LABELS, GAMES, INTEGRITY, RUNNER, TRACKS, type SoloGame, type Track } from "@/config/game";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkIntegrity, type IntegrityFlag } from "@/lib/typing/integrity";
import {
  addCoins,
  hashLines,
  loadUncached,
  makeToken,
  readToken,
  refreshGrowth,
  toAttempt,
  type AttemptRow,
  type Who,
} from "@/lib/practice/server";
import { recentMedian } from "@/lib/practice/derive";
import type { Attempt, PracticeData } from "@/lib/practice/types";
import { rainSequence, replayRain, type RainEvent, type RainResult } from "./rain";
import { gameSequence } from "./words";

/** v 2: 문장 순서 단어(lv = 학생 단계). v 없음: 예전 낱말 모음(lv = 글 난이도) — 배포 때 진행 중이던 판용 */
type GameTicket = { u: string; g: SoloGame; track: Track; lv: number; seed: number; h: string; s: number; v?: 2 };

const ticketWords = (t: GameTicket) => (t.v === 2 ? gameSequence(t.track, t.lv, t.seed) : rainSequence(t.track, t.lv, t.seed));

export type IssuedGame = { words: string[]; token: string };

export async function issueGame(who: Who, game: SoloGame, track: Track): Promise<IssuedGame | { error: string }> {
  if (game !== "rain" && game !== "runner") return { error: "게임을 찾을 수 없어요." };
  if (!TRACKS.includes(track)) return { error: "트랙을 찾을 수 없어요." };
  const data = await loadUncached(who.userId);
  const seed = randomInt(1, 2 ** 31);
  // 지금 단계 근처 글에서, 문장을 골라 낱말을 순서대로
  const lv = data.progress.unlocked[track];
  const words = gameSequence(track, lv, seed);
  if (!words.length) return { error: "이 트랙에는 아직 게임 단어가 없어요." };
  const ticket: GameTicket = { u: who.userId, g: game, track, lv, seed, h: hashLines(words), s: Date.now(), v: 2 };
  return { words, token: makeToken(ticket) };
}

export type GameSubmission = {
  token: string;
  events: RainEvent[];
  durationMs: number;
  keyTimes: number[];
};

export type GameSave = {
  attempt: Attempt;
  result: RainResult;
  best: number;
  newBest: boolean;
  before: { cpm: number; accuracy: number } | null;
  coins: number;
};

export async function saveGame(
  who: Who,
  sub: GameSubmission,
): Promise<{ save: GameSave; data: PracticeData } | { error: string }> {
  const ticket = readToken<GameTicket>(sub.token);
  if (!ticket || ticket.u !== who.userId || (ticket.g !== "rain" && ticket.g !== "runner")) return { error: "게임 표가 올바르지 않아요. 다시 시작해 주세요." };
  const elapsed = Date.now() - ticket.s;
  if (elapsed > 20 * 60000) return { error: "시간이 너무 지났어요. 다시 시작해 주세요." };

  const admin = createAdminClient();
  const { count } = await admin
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", who.userId)
    .gt("created_at", new Date(ticket.s).toISOString());
  if ((count ?? 0) > 0) return { error: "이미 저장한 판이에요." };

  // 단어 순서는 서버가 시드로 다시 만듦 (화면이 보낸 단어를 믿지 않음)
  const before = await loadUncached(who.userId);
  const words = ticketWords(ticket);
  const sameWords = hashLines(words) === ticket.h;

  const game = ticket.g;
  const maxMs = (game === "rain" ? GAMES.rain.maxSeconds : RUNNER.maxSeconds) * 1000;
  const durationMs = Math.min(Math.max(1000, Math.round(sub.durationMs)), elapsed + 3000, maxMs + 3000);
  const events = (sub.events ?? []).slice(0, 2000);
  const result = replayRain(words, events, durationMs);

  const cpm = Math.round(result.keystrokes / (durationMs / 60000));
  const accuracy = result.hits + result.wrong ? Math.round((result.hits / (result.hits + result.wrong)) * 1000) / 10 : 0;

  const flags = new Set<IntegrityFlag>(checkIntegrity(ticket.track, cpm, (sub.keyTimes ?? []).slice(0, 5000)));
  if (!result.valid || !sameWords) flags.add("too-regular");
  if (result.keystrokes > 40 && (sub.keyTimes?.length ?? 0) < result.keystrokes * 0.3) flags.add("too-regular");
  if (cpm > INTEGRITY.maxCpm[ticket.track]) flags.add("too-fast");
  const suspicious = flags.size > 0;

  const level = game === "rain" ? GAMES.rain.level : RUNNER.level;
  const ins = await admin
    .from("attempts")
    .insert({
      student_id: who.userId,
      class_id: who.classId,
      kind: "game",
      track: ticket.track,
      level,
      mode: game,
      cpm,
      accuracy,
      keystrokes: result.keystrokes,
      duration_ms: durationMs,
      missed_keys: {},
      flags: [...flags],
      suspicious,
      review_status: suspicious ? "pending" : "none",
      score: result.score,
    })
    .select("*")
    .single();
  if (ins.error) return { error: "기록을 저장하지 못했어요. 다시 해 주세요." };
  const attempt = toAttempt(ins.data as AttemptRow);

  const prevBest = Math.max(
    0,
    ...before.attempts.filter((a) => a.kind === "game" && a.mode === game && a.track === ticket.track && !a.suspicious).map((a) => a.score ?? 0),
  );
  const newBest = !suspicious && result.score > prevBest && prevBest > 0;

  let coins = 0;
  if (!suspicious && result.hits > 0) {
    await addCoins(who.userId, GAME_COINS.play, GAME_LABELS[game]);
    coins += GAME_COINS.play;
    if (newBest) {
      await addCoins(who.userId, GAME_COINS.best, `${GAME_LABELS[game]} 최고 점수`);
      coins += GAME_COINS.best;
    }
    await refreshGrowth(who);
  }

  return {
    save: {
      attempt,
      result,
      best: Math.max(prevBest, suspicious ? 0 : result.score),
      newBest,
      before: recentMedian(before.attempts, ticket.track, level),
      coins,
    },
    data: await loadUncached(who.userId),
  };
}
