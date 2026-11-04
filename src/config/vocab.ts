// 영단어 연구소 (2026-11-04, 영어 선생님 단어 목록 4탄~10탄). 숫자·보상은 여기서만 바꿔요.

export const VOCAB = {
  /** 뜻 비 기록의 레벨 값 (성장 점수 기준값을 뜻 비끼리만 비교하려고) */
  gameLevel: -3,
  /** 빈칸 채우기: 한 단어에서 가리는 글자 비율 (첫 글자는 늘 보여 줌) */
  blankHideRatio: 0.45,
  /** 묶음 하나를 처음 끝냈을 때 코인 (빈칸·듣고 쓰기 따로) */
  clearCoins: 5,
  /** 듣고 쓰기: 한 단어에 들을 수 있는 횟수, 읽는 빠르기 */
  listen: { maxPlays: 3, rate: 0.85 },
  /** 이번 주 단어: 첫 주와, 그 주에 나오는 묶음 번호. 그 뒤로 한 주에 한 묶음씩 */
  week: { firstMonday: "2026-11-02", firstPart: 1, coins: 20 },
  /** 틀린 단어장: 연속으로 이만큼 맞히면 단어장에서 빠져요 */
  review: { rightToRemove: 2, perRound: 10 },
} as const;

/** 활동 이름 (level_clears 의 track 값) */
export const VOCAB_CLEAR = { blank: "vocab-blank", listen: "vocab-listen", week: "vocab-week" } as const;
