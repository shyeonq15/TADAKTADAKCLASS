// 시즌 = 반 대결 기간. 화면·서버 같이 써요.
// 보통은 CLASS_BATTLE.firstMonday 부터 14일씩. CLASS_BATTLE.events 의 특별 대결 기간은 통째로 한 시즌이고,
// 특별 대결이 끝난 다음 날부터 다시 14일씩 끊어요.
// 주(week)는 월요일 시작. 날짜는 한국 시간 "YYYY-MM-DD" 로 다뤄요.

import { CLASS_BATTLE, GROWTH, type BattleEvent } from "@/config/game";

const DAY = 86400000;
const toMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (day: string, n: number) => toDay(toMs(day) + n * DAY);

export type Season = { n: number; start: string; end: string; event?: BattleEvent };

/** 이 날짜가 속한 시즌 (1부터). 첫 시즌 전이면 0 이하 */
export function seasonOf(day: string): Season {
  const len = GROWTH.classBattlePeriodDays;
  let anchor = CLASS_BATTLE.firstMonday;
  let before = 0; // anchor 앞까지 지나간 시즌 수
  if (day < anchor) {
    const idx = Math.floor((toMs(day) - toMs(anchor)) / DAY / len);
    const start = toMs(anchor) + idx * len * DAY;
    return { n: idx + 1, start: toDay(start), end: toDay(start + (len - 1) * DAY) };
  }
  for (const ev of CLASS_BATTLE.events) {
    if (ev.end < anchor) continue;
    // anchor ~ 이벤트 전날까지 보통 시즌 몇 개 (마지막 것은 이벤트 전날에서 잘려요)
    const regular = Math.max(0, Math.ceil((toMs(ev.start) - toMs(anchor)) / DAY / len));
    if (day < ev.start) {
      const idx = Math.floor((toMs(day) - toMs(anchor)) / DAY / len);
      const start = toDay(toMs(anchor) + idx * len * DAY);
      const end = addDays(start, len - 1);
      return { n: before + idx + 1, start, end: end < ev.start ? end : addDays(ev.start, -1) };
    }
    if (day <= ev.end) return { n: before + regular + 1, start: ev.start, end: ev.end, event: ev };
    before += regular + 1;
    anchor = addDays(ev.end, 1);
  }
  const idx = Math.floor((toMs(day) - toMs(anchor)) / DAY / len);
  const start = toDay(toMs(anchor) + idx * len * DAY);
  return { n: before + idx + 1, start, end: addDays(start, len - 1) };
}

/** n번째 시즌의 기간 */
export function seasonByNumber(n: number): Season {
  let s = seasonOf(CLASS_BATTLE.firstMonday);
  while (s.n < n) s = seasonOf(addDays(s.end, 1));
  return s;
}

/** 이 날짜가 속한 주 (월~일) */
export function weekOf(day: string) {
  const ms = toMs(day);
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // 월=0 … 일=6
  return { start: toDay(ms - dow * DAY), end: toDay(ms + (6 - dow) * DAY) };
}

/** 시즌 끝까지 남은 날 (오늘 포함) */
export const daysLeft = (s: Season, today: string) => Math.max(0, Math.round((toMs(s.end) - toMs(today)) / DAY) + 1);

/** 홈에 공지를 띄울 특별 대결 (공지 시작일 ~ 끝 날) */
export function eventToNotice(today: string): BattleEvent | null {
  return CLASS_BATTLE.events.find((e) => today >= e.noticeFrom && today <= e.end) ?? null;
}
