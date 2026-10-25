import NOTES from "./code-notes.json";

/** 코드 지문 설명 카드 · 결과 맞히기 퀴즈 · 빈칸 */
export type CodeNote = {
  concept: string;
  explain: string;
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
