// 이름 뒤 조사: 받침이 있으면 앞 것("이"), 없으면 뒤 것("가"). 한글이 아닌 글자로 끝나면 숫자·영어 발음을 대충 따라가요.

const NUM_BATCHIM = new Set(["0", "1", "3", "6", "7", "8"]); // 영, 일, 삼, 육, 칠, 팔

/** 조사만 골라 줘요 */
export function particle(word: string, withBatchim: string, without: string) {
  const last = word.trim().slice(-1);
  if (!last) return without;
  const code = last.charCodeAt(0);
  let has: boolean;
  if (code >= 0xac00 && code <= 0xd7a3) has = (code - 0xac00) % 28 !== 0;
  else if (/[0-9]/.test(last)) has = NUM_BATCHIM.has(last);
  else has = /[lmnr]/i.test(last); // 영어: l·m·n·r 로 끝나면 받침처럼 읽혀요
  return has ? withBatchim : without;
}

/** 이름 + 조사 */
export const josa = (word: string, withBatchim: string, without: string) => `${word}${particle(word, withBatchim, without)}`;
