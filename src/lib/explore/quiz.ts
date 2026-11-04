// 교과 탐험 개념 빈칸 퀴즈: 선생님이 지문에서 [대괄호]로 감싼 낱말이 빈칸이 돼요.
//   예) 힘이 작용하는 면적이 [좁을수록] 압력은 [커진다].
// 타자 칠 때는 대괄호만 빼고 보여 줘요. 화면과 서버가 같이 쓰는 순수 함수예요.

/** 문장 조각: 그냥 글자 또는 빈칸(정답) */
export type QuizPart = string | { answer: string };
export type QuizSentence = QuizPart[];

/** 타자용: 대괄호만 빼기 */
export const stripBlanks = (line: string) => line.replace(/\[([^\]\n]*)\]/g, "$1").replace(/[[\]]/g, "");

export const hasBlanks = (text: string) => /\[[^\]\n]+\]/.test(text);

/**
 * 지문들(판마다 줄바꿈으로 나뉜 글) → 빈칸이 있는 문장들.
 * 긴 문장은 판·줄 사이에서 띄어쓰기로 나뉘어 있어서, 띄어쓰기로 다시 이어 붙인 뒤 문장으로 나눠요
 */
export function quizSentences(bodies: readonly string[]): QuizSentence[] {
  const text = bodies.join(" ").replace(/\s+/g, " ").trim();
  const sentences = text.split(/(?<=[.!?])\s+(?![^[]*\])/);
  const out: QuizSentence[] = [];
  for (const s of sentences) {
    if (!hasBlanks(s)) continue;
    const parts: QuizPart[] = [];
    let last = 0;
    for (const m of s.matchAll(/\[([^\]]+)\]/g)) {
      if (m.index! > last) parts.push(s.slice(last, m.index));
      parts.push({ answer: m[1].trim() });
      last = m.index! + m[0].length;
    }
    if (last < s.length) parts.push(s.slice(last));
    out.push(parts);
  }
  return out;
}

export const blankCount = (bodies: readonly string[]) => quizSentences(bodies).reduce((n, s) => n + s.filter((p) => typeof p !== "string").length, 0);

/** 답 비교: 띄어쓰기는 너그럽게 */
export const sameAnswer = (typed: string, answer: string) => typed.replace(/\s+/g, "") === answer.replace(/\s+/g, "");

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
/** 초성 힌트: "압력" → "ㅇㄹ" (한글이 아닌 글자·띄어쓰기는 그대로) */
export const chosung = (s: string) =>
  [...s]
    .map((ch) => {
      const c = ch.charCodeAt(0) - 0xac00;
      return c >= 0 && c < 11172 ? CHOSUNG[Math.floor(c / 588)] : ch;
    })
    .join("");

/** 퀴즈 전체에서 빈칸의 정답들 (문장 순서대로) */
export const allAnswers = (sentences: readonly QuizSentence[]) =>
  sentences.flatMap((s) => s.filter((p): p is { answer: string } => typeof p !== "string").map((p) => p.answer));

/**
 * 보기: 이 문장의 정답들 + 다른 문장의 정답 몇 개(헷갈리게), 섞어서.
 * seed 가 같으면 같은 순서 (문장마다 보기가 매번 바뀌지 않게)
 */
export function wordBank(sentence: QuizSentence, all: readonly string[], seed: number, extra = 2): string[] {
  const mine = sentence.filter((p): p is { answer: string } => typeof p !== "string").map((p) => p.answer);
  let a = seed >>> 0;
  const rand = () => {
    a = (Math.imul(a, 1103515245) + 12345) >>> 0;
    return a / 4294967296;
  };
  const others = [...new Set(all.filter((w) => !mine.includes(w)))];
  const picked: string[] = [];
  while (picked.length < Math.min(extra, others.length)) {
    const w = others[Math.floor(rand() * others.length)];
    if (!picked.includes(w)) picked.push(w);
  }
  const bank = [...new Set([...mine, ...picked])];
  for (let i = bank.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  return bank;
}

/** 서버 채점: 빈칸마다 처음 친 답(문장 순서대로)이 정답과 같은 개수 */
export function scoreFirstAnswers(sentences: readonly QuizSentence[], firstAnswers: readonly unknown[]) {
  const answers = allAnswers(sentences);
  let score = 0;
  answers.forEach((ans, i) => {
    const t = firstAnswers[i];
    if (typeof t === "string" && sameAnswer(t, ans)) score++;
  });
  return { score, total: answers.length };
}
