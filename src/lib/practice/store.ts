"use client";

// 로그인·DB 연결 전 임시 저장소: 이 브라우저의 localStorage에 기록을 둡니다.
// Supabase가 연결되면 같은 함수 이름으로 서버 저장으로 바꿉니다.
// ⚠️ 여기서 계산하는 코인·성장 점수는 "미리보기"예요. 진짜 지급은 서버에서만 합니다.

import { useSyncExternalStore } from "react";
import { COINS, LEVEL_CLEAR, TRACKS, type Track } from "@/config/game";
import { getLevel, maxLevel, type PracticeMode } from "@/data/packs";
import type { IntegrityFlag } from "@/lib/typing/integrity";
import { dailyGrowth, median } from "@/lib/scoring/growth";

export type AttemptKind = "practice" | "mission" | "weak" | "placement";

export type Attempt = {
  id: string;
  kind: AttemptKind;
  track: Track;
  level: number;
  mode: PracticeMode | "weak" | "placement";
  cpm: number;
  accuracy: number;
  keystrokes: number;
  durationMs: number;
  missedKeys: Record<string, number>;
  flags: IntegrityFlag[];
  suspicious: boolean;
  at: number;
};

export type CoinEntry = { at: number; amount: number; reason: string };

export type Progress = {
  /** 트랙별로 열린 가장 높은 레벨 */
  unlocked: Record<Track, number>;
  /** 통과한 레벨 "korean-1" */
  cleared: string[];
  /** 배치 테스트 타수. 안 했으면 null */
  placement: Record<Track, number> | null;
  coins: number;
  classCoins: number;
  coinLog: CoinEntry[];
  /** 레벨 첫 통과 기록 (성장 점수 "레벨 첫 클리어"용) */
  clearLog: { id: string; at: number }[];
  /** 미션 완료한 날짜 YYYY-MM-DD */
  missionDays: string[];
};

export type Data = { attempts: Attempt[]; progress: Progress };

const KEY = "tadak:practice:v1";

const EMPTY: Data = {
  attempts: [],
  progress: {
    unlocked: { korean: 1, english: 1, symbol: 1, code: 1 },
    cleared: [],
    placement: null,
    coins: 0,
    classCoins: 0,
    coinLog: [],
    clearLog: [],
    missionDays: [],
  },
};

let cache: Data | null = null;
const listeners = new Set<() => void>();

function read(): Data {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Data;
    return { attempts: parsed.attempts ?? [], progress: { ...EMPTY.progress, ...parsed.progress } };
  } catch {
    return EMPTY;
  }
}

function write(next: Data) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 저장이 막힌 브라우저에서도 화면은 계속 동작
  }
  listeners.forEach((l) => l());
}

function getSnapshot(): Data {
  if (!cache) cache = read();
  return cache;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = read();
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** 화면에서 기록·진행 상황을 읽는 훅. 서버 렌더링 때는 빈 값 */
export function usePracticeData(): Data {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

/** 로컬 날짜 YYYY-MM-DD */
export function dayKey(t: number | Date = Date.now()) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ───────── 계산 도우미 ───────── */

/** 같은 트랙·레벨 최근 5회 중앙값 (결과 화면의 "내 평균") */
export function recentMedian(attempts: readonly Attempt[], track: Track, level: number, before?: number) {
  const same = attempts.filter(
    (a) => a.track === track && a.level === level && !a.suspicious && a.kind !== "placement" && (!before || a.at < before),
  );
  const recent = same.slice(-5);
  if (recent.length === 0) return null;
  return { cpm: median(recent.map((a) => a.cpm)), accuracy: median(recent.map((a) => a.accuracy)) };
}

/** 약한 키 상위 n개 (트랙을 주면 그 트랙만) */
export function weakKeys(attempts: readonly Attempt[], track?: Track, n = 5): { key: string; count: number }[] {
  const total: Record<string, number> = {};
  for (const a of attempts.slice(-30)) {
    if (track && a.track !== track) continue;
    for (const [k, c] of Object.entries(a.missedKeys)) total[k] = (total[k] ?? 0) + c;
  }
  return Object.entries(total)
    .filter(([k]) => k.trim())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/** 오늘까지 연속으로 연습한 날 수 */
export function streakDays(attempts: readonly Attempt[], today = Date.now()) {
  const days = new Set(attempts.map((a) => dayKey(a.at)));
  let n = 0;
  const d = new Date(today);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // 오늘 아직 안 쳤으면 어제부터
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* ───────── 기록 저장 ───────── */

export type SaveResult = {
  attempt: Attempt;
  /** 같은 트랙·레벨 최근 5회 중앙값 (이번 기록 전) */
  before: { cpm: number; accuracy: number } | null;
  personalBest: boolean;
  cleared: boolean;
  firstClear: boolean;
  unlockedLevel: number | null;
  coins: number;
};

export function saveAttempt(input: Omit<Attempt, "id" | "at" | "suspicious">): SaveResult {
  const data = getSnapshot();
  const at = Date.now();
  const attempt: Attempt = { ...input, id: `${at}-${Math.random().toString(36).slice(2, 8)}`, at, suspicious: input.flags.length > 0 };

  const before = recentMedian(data.attempts, attempt.track, attempt.level);
  const prevBest = Math.max(
    0,
    ...data.attempts.filter((a) => a.track === attempt.track && !a.suspicious && a.kind !== "placement").map((a) => a.cpm),
  );
  const personalBest = !attempt.suspicious && attempt.kind !== "placement" && prevBest > 0 && attempt.cpm > prevBest;

  // 레벨 통과 (정식 레벨 연습·미션만)
  const progress = {
    ...data.progress,
    unlocked: { ...data.progress.unlocked },
    cleared: [...data.progress.cleared],
    clearLog: [...data.progress.clearLog],
  };
  const level = getLevel(attempt.track, attempt.level);
  const canClear = (attempt.kind === "practice" || attempt.kind === "mission") && level && !attempt.suspicious;
  const cleared = !!canClear && attempt.accuracy >= LEVEL_CLEAR.minAccuracy && attempt.cpm >= level.goalCpm;
  const clearId = `${attempt.track}-${attempt.level}`;
  const firstClear = cleared && !progress.cleared.includes(clearId);
  let unlockedLevel: number | null = null;
  if (firstClear) {
    progress.cleared.push(clearId);
    progress.clearLog.push({ id: clearId, at });
    const next = attempt.level + 1;
    if (next <= maxLevel(attempt.track) && next > progress.unlocked[attempt.track]) {
      progress.unlocked[attempt.track] = next;
      unlockedLevel = next;
    }
  }

  // 코인 (미리보기)
  let coins = 0;
  const log: CoinEntry[] = [];
  if (!attempt.suspicious && attempt.kind !== "placement") {
    coins += COINS.practiceRound;
    log.push({ at, amount: COINS.practiceRound, reason: "연습 완료" });
    if (personalBest) {
      coins += COINS.personalBest;
      log.push({ at, amount: COINS.personalBest, reason: "개인 기록 갱신" });
    }
  }
  progress.coins += coins;
  progress.coinLog = [...progress.coinLog, ...log].slice(-100);

  write({ attempts: [...data.attempts, attempt].slice(-500), progress });
  return { attempt, before, personalBest, cleared, firstClear, unlockedLevel, coins };
}

/** 오늘의 미션 완료 처리. 이미 오늘 받았으면 0 */
export function completeMission(): { coins: number; classCoins: number; firstToday: boolean } {
  const data = getSnapshot();
  const today = dayKey();
  if (data.progress.missionDays.includes(today)) return { coins: 0, classCoins: 0, firstToday: false };
  const at = Date.now();
  write({
    ...data,
    progress: {
      ...data.progress,
      coins: data.progress.coins + COINS.missionPersonal,
      classCoins: data.progress.classCoins + COINS.missionClass,
      coinLog: [...data.progress.coinLog, { at, amount: COINS.missionPersonal, reason: "오늘의 미션 완료" }].slice(-100),
      missionDays: [...data.progress.missionDays, today],
    },
  });
  return { coins: COINS.missionPersonal, classCoins: COINS.missionClass, firstToday: true };
}

/** 배치 테스트 결과 저장 → 트랙별 시작 레벨 열기 */
export function savePlacement(cpmByTrack: Record<Track, number>, startLevels: Record<Track, number>) {
  const data = getSnapshot();
  const unlocked = { ...data.progress.unlocked };
  for (const t of TRACKS) unlocked[t] = Math.max(unlocked[t], startLevels[t]);
  write({ ...data, progress: { ...data.progress, placement: cpmByTrack, unlocked } });
}

/** 연습 기록 모두 지우기 (테스트용) */
export function resetPractice() {
  write(EMPTY);
}

/** 오늘의 성장 점수 미리보기 (진짜 점수는 서버에서 계산) */
export function todayGrowth(data: Data, now = Date.now()) {
  const today = dayKey(now);
  const scored = data.attempts.filter((a) => a.kind !== "placement");
  return dailyGrowth({
    today: scored.filter((a) => dayKey(a.at) === today),
    history: scored.filter((a) => dayKey(a.at) < today),
    missionDone: data.progress.missionDays.includes(today),
    streakDays: streakDays(data.attempts, now),
    firstClearToday: data.progress.clearLog.some((c) => dayKey(c.at) === today),
    placement: data.progress.placement ?? undefined,
  });
}
