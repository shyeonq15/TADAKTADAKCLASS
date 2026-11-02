// 시즌 = 반 대결 2주 기간 (CLASS_BATTLE.firstMonday 부터 14일씩). 화면·서버 같이 써요.
// 주(week)는 월요일 시작. 날짜는 한국 시간 "YYYY-MM-DD" 로 다뤄요.

import { CLASS_BATTLE, GROWTH } from "@/config/game";

const DAY = 86400000;
const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export type Season = { n: number; start: string; end: string };

/** 이 날짜가 속한 시즌 (1부터). 첫 시즌 전이면 0 */
export function seasonOf(day: string): Season {
  const len = GROWTH.classBattlePeriodDays;
  const idx = Math.floor((toMs(day) - toMs(CLASS_BATTLE.firstMonday)) / DAY / len);
  const start = toMs(CLASS_BATTLE.firstMonday) + idx * len * DAY;
  return { n: idx + 1, start: toDay(start), end: toDay(start + (len - 1) * DAY) };
}

/** n번째 시즌의 기간 */
export function seasonByNumber(n: number): Season {
  const len = GROWTH.classBattlePeriodDays;
  const start = toMs(CLASS_BATTLE.firstMonday) + (n - 1) * len * DAY;
  return { n, start: toDay(start), end: toDay(start + (len - 1) * DAY) };
}

/** 이 날짜가 속한 주 (월~일) */
export function weekOf(day: string) {
  const ms = toMs(day);
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // 월=0 … 일=6
  return { start: toDay(ms - dow * DAY), end: toDay(ms + (6 - dow) * DAY) };
}

/** 시즌 끝까지 남은 날 (오늘 포함) */
export const daysLeft = (s: Season, today: string) => Math.max(0, Math.round((toMs(s.end) - toMs(today)) / DAY) + 1);
