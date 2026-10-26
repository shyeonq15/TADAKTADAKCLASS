import NOTES from "./code-notes.json";
import LESSONS from "./lessons.json";

/** 코드 지문 설명 카드 · 결과 맞히기 퀴즈 · 빈칸 */
export type CodeNote = {
  concept: string;
  /** 문단은 줄바꿈으로 나눔 */
  explain: string;
  /** 알아 두기 (선택) */
  tip?: string;
  /** 줄마다 짧은 풀이 */
  lines: string[];
  /** 퀴즈 질문 (없으면 "실행하면 무엇이 출력될까요?") */
  question?: string;
  /** 실제 출력 = 정답 */
  output: string;
  /** 오답 3개 */
  choices: string[];
  blank: { line: number; text: string };
};

export function codeNote(level: number, index: number): CodeNote | null {
  const list = (NOTES as unknown as Record<string, CodeNote[]>)[String(level)];
  return list?.[index] ?? null;
}

/** 빈칸 위치 (줄 번호, 시작 칸, 길이) */
export function blankMask(lines: readonly string[], note: CodeNote) {
  const start = lines[note.blank.line]?.indexOf(note.blank.text) ?? -1;
  return start < 0 ? null : { line: note.blank.line, start, length: note.blank.text.length };
}

/* ───────── 파이썬 첫걸음 (9단원 43강: print부터 함수·import까지) ───────── */

/** 설명 슬라이드 한 장: 글 + (예시 코드와 결과) + (확인 문제, 첫 보기가 정답) */
export type LessonSlide = {
  title: string;
  body: string[];
  code?: string;
  output?: string;
  check?: { q: string; choices: string[]; answer: number; why: string };
};

type LessonRow = Omit<CodeNote, "explain"> & { unit?: string; code: string; summary: string; slides: LessonSlide[] };

export const LESSON_COUNT = (LESSONS as unknown as LessonRow[]).length;

/** n강 (1부터) */
export function lesson(n: number): { note: CodeNote; lines: string[] } | null {
  const row = (LESSONS as unknown as LessonRow[])[n - 1];
  if (!row) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { code, summary, slides, ...rest } = row;
  const note: CodeNote = { ...rest, explain: summary };
  return { note, lines: code.split("\n") };
}

export const lessonTitle = (n: number) => (LESSONS as unknown as LessonRow[])[n - 1]?.concept ?? "";

/** 단원 이름 (예: "6단원 · 조건 (선택문)") */
export const lessonUnit = (n: number) => (LESSONS as unknown as LessonRow[])[n - 1]?.unit ?? "";

export const lessonSlides = (n: number): LessonSlide[] => (LESSONS as unknown as LessonRow[])[n - 1]?.slides ?? [];
