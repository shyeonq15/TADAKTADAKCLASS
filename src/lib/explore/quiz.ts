// 교과 탐험 개념 빈칸 퀴즈: 선생님이 지문에서 [대괄호]로 감싼 낱말이 빈칸이 돼요.
//   예) 힘이 작용하는 면적이 [좁을수록] 압력은 [커진다].
// 타자 칠 때는 대괄호만 빼고 보여 줘요. 화면과 서버가 같이 쓰는 순수 함수예요.

/** 문장 조각: 그냥 글자 또는 빈칸(정답) */
/** 빈칸: 정답 + 바로 뒤 글자 몇 개(tail). "[5만] 원이라서"에서 "5만원"처럼 단위·조사를 붙여 쳐도 맞게 해요 */
export type QuizBlank = { answer: string; tail?: string };
export type QuizPart = string | QuizBlank;
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
  // "Mrs." 같은 호칭 뒤에서는 나누지 않아요. 닫는 따옴표 뒤도 문장 끝
  const sentences = text.split(/(?<!\bMrs?\.)(?<=[.!?]["']?)\s+(?![^[]*\])/);
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
    // 빈칸 바로 뒤에 이어지는 글자(띄어쓰기 빼고 최대 2자, 문장부호 전까지)를 tail 로
    parts.forEach((p, i) => {
      const next = parts[i + 1];
      if (typeof p === "string" || typeof next !== "string") return;
      const tail = next.replace(/\s+/g, "").match(/^[가-힣A-Za-z0-9]{1,2}/)?.[0];
      if (tail) p.tail = tail;
    });
    out.push(parts);
  }
  return out;
}

export const blankCount = (bodies: readonly string[]) => quizSentences(bodies).reduce((n, s) => n + s.filter((p) => typeof p !== "string").length, 0);

/**
 * 답 비교: 띄어쓰기는 너그럽게. 정답 뒤에 이어지는 글자를 붙여 쳐도 맞아요
 * (건의함 #39: "[5만] 원이라서"에 "5만원", "[집]으로"에 "집으로"를 치면 틀렸다고 나왔음)
 */
export const sameAnswer = (typed: string, blank: QuizBlank) => {
  const t = typed.replace(/\s+/g, "");
  const a = blank.answer.replace(/\s+/g, "");
  if (t === a) return true;
  const tail = blank.tail ?? "";
  for (let k = 1; k <= tail.length; k++) if (t === a + tail.slice(0, k)) return true;
  return false;
};

const CHOSUNG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
/** 초성 힌트: "압력" → "ㅇㄹ" (한글이 아닌 글자·띄어쓰기는 그대로) */
export const chosung = (s: string) =>
  /[가-힣]/.test(s)
    ? [...s]
        .map((ch) => {
          const c = ch.charCodeAt(0) - 0xac00;
          return c >= 0 && c < 11172 ? CHOSUNG[Math.floor(c / 588)] : ch;
        })
        .join("")
    : // 영어 등: 낱말마다 첫 글자만 보여 주고 나머지는 _ ("picked up" → "p_____ u_")
      s.replace(/[A-Za-z]+/g, (w) => w[0] + "_".repeat(w.length - 1));

/** 퀴즈 전체에서 빈칸의 정답들 (문장 순서대로) */
export const allAnswers = (sentences: readonly QuizSentence[]) =>
  sentences.flatMap((s) => s.filter((p): p is QuizBlank => typeof p !== "string"));

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
