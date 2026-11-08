// 휴대폰·태블릿 구분 (교사 결정 2026-11-09: 타자 연습은 컴퓨터 + 물리 키보드에서만).
// 화면과 서버가 같이 써요.

/** 브라우저 이름표(User-Agent)로 본 휴대폰·태블릿 */
export function isMobileUA(ua: string) {
  return /Android|iPhone|iPad|iPod|Mobi|Windows Phone|webOS|BlackBerry|Opera Mini|Kindle|Silk/i.test(ua);
}

/**
 * 화면에서만 알 수 있는 경우까지 확인 (브라우저에서만 불러요):
 *  · "데스크톱 사이트로 보기"를 켠 아이패드 (이름표가 맥처럼 보이지만 터치 화면)
 *  · 마우스·터치패드 없이 손가락으로만 쓰는 기기
 */
export function isMobileDevice() {
  const ua = navigator.userAgent;
  if (isMobileUA(ua)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
  return matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
}

export const PC_ONLY_MESSAGE = "타자 연습은 컴퓨터에서만 할 수 있어요. 키보드가 있는 컴퓨터로 들어와 주세요!";
