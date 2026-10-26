// 타자 엔진: 입력값을 받아 상태를 바꾸는 순수 함수 모음.
// 화면(React)과 분리되어 있어서 테스트하기 쉽고, 대결 화면에서도 그대로 씁니다.

import { countKeystrokes, isHangul, missedKey, toKeys } from "./hangul";

export type CharState = "pending" | "current" | "composing" | "correct" | "error";

export type SessionState = {
  lines: readonly string[];
  /** 코드 지문: 다음 줄로 갈 때 들여쓰기를 미리 채움 */
  autoIndent: boolean;
  lineIndex: number;
  /** 지금 줄에 친 내용 */
  typed: string;
  composing: boolean;
  /** 끝낸 줄에 친 내용 */
  doneLines: string[];
  /** 지금 줄에서 한 번이라도 틀린 위치 (고쳐도 오타로 셈) */
  lineErrors: number[];
  /** 지금 줄에서 확정된(조합이 끝난) 글자 수의 최댓값 */
  lineCommitted: number;
  totalErrors: number;
  totalCommitted: number;
  /** 놓친 키 → 횟수 */
  missedKeys: Record<string, number>;
  startedAt: number | null;
  finishedAt: number | null;
  /** 키를 누른 시각 (입력 간격 분석용) */
  keyTimes: number[];
};

export type InputResult = {
  state: SessionState;
  /** 붙여넣기 등으로 막은 입력 */
  blocked?: boolean;
};

const leadingWhitespace = (s: string) => s.match(/^[ \t]*/)?.[0] ?? "";

export function createSession(lines: readonly string[], options: { autoIndent?: boolean } = {}): SessionState {
  const autoIndent = options.autoIndent ?? false;
  const first = autoIndent ? leadingWhitespace(lines[0] ?? "") : "";
  return {
    lines,
    autoIndent,
    lineIndex: 0,
    typed: first,
    composing: false,
    doneLines: [],
    lineErrors: [],
    lineCommitted: first.length,
    totalErrors: 0,
    totalCommitted: 0,
    missedKeys: {},
    startedAt: null,
    finishedAt: null,
    keyTimes: [],
  };
}

export const isFinished = (s: SessionState) => s.finishedAt !== null;
export const currentLine = (s: SessionState) => s.lines[s.lineIndex] ?? "";

/** 지금 줄의 글자별 상태 */
export function lineStates(target: string, typed: string, composing: boolean): CharState[] {
  const committed = composing ? typed.length - 1 : typed.length;
  return [...target].map((ch, i) => {
    if (i < committed) return typed[i] === ch ? "correct" : "error";
    if (composing && i === committed) return "composing";
    if (!composing && i === typed.length) return "current";
    return "pending";
  });
}

/** 확정된 글자 중 새로 틀린 것을 기록 */
function recordErrors(s: SessionState, target: string, typed: string, committed: number): SessionState {
  let { lineErrors, missedKeys, totalErrors } = s;
  for (let i = 0; i < committed && i < target.length; i++) {
    if (typed[i] === target[i] || lineErrors.includes(i)) continue;
    const key = missedKey(target[i], typed[i]);
    lineErrors = [...lineErrors, i];
    missedKeys = { ...missedKeys, [key]: (missedKeys[key] ?? 0) + 1 };
    totalErrors++;
  }
  return { ...s, lineErrors, missedKeys, totalErrors };
}

function finishLine(s: SessionState, typed: string, now: number): SessionState {
  const target = currentLine(s);
  const body = typed.slice(0, target.length);
  let next = recordErrors({ ...s, typed: body, composing: false }, target, body, body.length);
  const committedHere = Math.max(next.lineCommitted, body.length);
  next = { ...next, totalCommitted: next.totalCommitted + committedHere, doneLines: [...next.doneLines, body] };

  const lineIndex = s.lineIndex + 1;
  if (lineIndex >= s.lines.length) {
    return { ...next, lineIndex, typed: "", lineErrors: [], lineCommitted: 0, finishedAt: now };
  }
  const indent = s.autoIndent ? leadingWhitespace(s.lines[lineIndex]) : "";
  return { ...next, lineIndex, typed: indent, lineErrors: [], lineCommitted: indent.length };
}

/**
 * 입력창 값이 바뀔 때마다 부릅니다.
 * - 줄 끝에서 Enter(또는 글 지문에서 Space)를 치면 다음 줄로
 * - 한 번에 3글자 이상 늘어나면 붙여넣기로 보고 막음
 */
export function applyInput(s: SessionState, rawValue: string, composing: boolean, now: number): InputResult {
  if (isFinished(s)) return { state: s };
  const target = currentLine(s);

  if (rawValue.length - s.typed.length > 2) return { state: s, blocked: true };

  const started = { ...s, startedAt: s.startedAt ?? now };

  // 줄 바꾸기
  const endsWithBreak = rawValue.endsWith("\n");
  const endsWithSpaceAfterLine = rawValue.endsWith(" ") && rawValue.length > target.length;
  if (endsWithBreak || endsWithSpaceAfterLine) {
    const body = rawValue.slice(0, -1).replace(/\n/g, "");
    if (body.length >= target.length) return { state: finishLine(started, body, now) };
    if (endsWithBreak) return { state: { ...started, typed: body, composing } };
  }

  const value = rawValue.replace(/\n/g, "").slice(0, target.length + 1);
  const committed = composing ? value.length - 1 : value.length;
  let next = recordErrors({ ...started, typed: value, composing }, target, value, committed);
  next = { ...next, lineCommitted: Math.max(next.lineCommitted, Math.min(committed, target.length)) };

  // 마지막 줄을 끝까지 맞게 쳤으면 Enter 없이 끝
  const isLastLine = s.lineIndex === s.lines.length - 1;
  if (isLastLine && value === target) return { state: finishLine(next, value, now) };

  return { state: next };
}

/** 키를 누를 때마다 시각을 남김 (Shift 같은 조합키는 빼고) */
export function recordKey(s: SessionState, now: number): SessionState {
  if (isFinished(s)) return s;
  return { ...s, keyTimes: [...s.keyTimes, now] };
}

/** 한/영 상태가 지문과 다른지. 다르면 어느 쪽으로 바꿔야 하는지 알려줌 */
export function imeHint(s: SessionState): "korean" | "english" | null {
  if (!s.typed) return null;
  const i = s.typed.length - 1;
  const want = currentLine(s)[i];
  const got = s.typed[i];
  if (!want || !got || want === got) return null;
  if (isHangul(want) && /[a-zA-Z]/.test(got)) return "korean";
  if (/[a-zA-Z]/.test(want) && isHangul(got)) return "english";
  return null;
}

/** 맞게 친 글자의 키 입력 수. skipIndent 면 줄 앞 들여쓰기(자동으로 채워 주는 칸)는 세지 않음 */
export function correctKeystrokes(target: string, typed: string, skipIndent = false): number {
  let n = 0;
  for (let i = skipIndent ? leadingWhitespace(target).length : 0; i < typed.length && i < target.length; i++) {
    if (typed[i] === target[i]) n += toKeys(target[i]).length;
  }
  return n;
}

/**
 * 여러 줄 타수. code(들여쓰기 자동 채움, 코드 지문)면 연습팩 규칙과 같게:
 * 줄 앞 들여쓰기는 빼고, 다음 줄로 넘어갈 때 누른 Enter 는 1타씩 (enters = 넘어간 줄 수)
 */
export function linesKeystrokes(lines: readonly string[], typed: readonly string[], code: boolean, enters: number): number {
  const chars = lines.reduce((n, line, i) => n + correctKeystrokes(line, typed[i] ?? "", code), 0);
  return chars + (code ? Math.max(0, enters) : 0);
}

/** 서버용: 낸 줄 수로 Enter 수 세기 (끝까지 쳤으면 마지막 줄은 Enter 없이 끝남) */
export const entersOf = (lineCount: number, doneCount: number) => (doneCount >= lineCount ? lineCount - 1 : doneCount);

export type SessionStats = {
  /** 타/분 (자모 기준, 맞게 친 것만) */
  cpm: number;
  /** % */
  accuracy: number;
  /** 0~1 */
  progress: number;
  elapsedMs: number;
  keystrokes: number;
};

export function sessionStats(s: SessionState, now: number): SessionStats {
  const elapsedMs = s.startedAt === null ? 0 : (s.finishedAt ?? now) - s.startedAt;

  const enters = isFinished(s) ? s.doneLines.length - 1 : s.doneLines.length;
  let keystrokes = linesKeystrokes(s.lines.slice(0, s.doneLines.length), s.doneLines, s.autoIndent, enters);
  if (!isFinished(s)) {
    const target = currentLine(s);
    // 조합 중인 글자는 목표로 가는 중이면 아직 세지 않음
    const settled = s.composing ? s.typed.slice(0, -1) : s.typed;
    keystrokes += correctKeystrokes(target, settled, s.autoIndent);
  }

  const committed = s.totalCommitted + (isFinished(s) ? 0 : s.lineCommitted);
  const accuracy = committed === 0 ? 100 : Math.max(0, ((committed - s.totalErrors) / committed) * 100);

  const totalChars = s.lines.reduce((n, l) => n + l.length, 0) || 1;
  const doneChars = s.doneLines.reduce((n, l) => n + l.length, 0) + (isFinished(s) ? 0 : s.typed.length);

  const minutes = elapsedMs / 60000;
  return {
    cpm: minutes > 0.02 ? Math.round(keystrokes / minutes) : 0,
    accuracy: Math.round(accuracy * 10) / 10,
    progress: Math.min(1, doneChars / totalChars),
    elapsedMs,
    keystrokes,
  };
}

/** 지문 전체의 키 입력 수 (결과 화면·대결 진행률 검증에 사용) */
export const passageKeystrokes = (lines: readonly string[]) => lines.reduce((n, l) => n + countKeystrokes(l), 0);


/** 시간이 다 됐을 때: 치던 줄까지 기록하고 끝냄 (조합 중인 글자는 뺌) */
export function finishSession(s: SessionState, now: number): SessionState {
  if (isFinished(s)) return s;
  const target = currentLine(s);
  const settled = (s.composing ? s.typed.slice(0, -1) : s.typed).slice(0, target.length);
  const next = recordErrors(s, target, settled, settled.length);
  return {
    ...next,
    typed: "",
    composing: false,
    doneLines: [...next.doneLines, settled],
    totalCommitted: next.totalCommitted + Math.max(Math.min(next.lineCommitted, settled.length), settled.length),
    lineCommitted: 0,
    finishedAt: now,
  };
}
