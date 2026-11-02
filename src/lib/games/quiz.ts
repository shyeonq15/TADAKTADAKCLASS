// 단어 비의 단어 하나 = "문제\t답" 형식도 쓸 수 있게 (보이는 글자와 칠 글자를 나눔). 지금은 보통 단어만 써요.


/** 문제·답 나누기 (탭이 없으면 보이는 것 = 칠 것) */
export function quizParts(word: string): { show: string; answer: string } {
  const i = word.indexOf("\t");
  return i < 0 ? { show: word, answer: word } : { show: word.slice(0, i), answer: word.slice(i + 1) };
}
