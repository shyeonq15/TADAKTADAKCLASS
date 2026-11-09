// 휴대폰·태블릿 구분 (교사 결정 2026-11-09):
//  · 휴대폰: 타자 화면은 못 들어와요. 영단어·퀴즈 같은 다른 화면은 괜찮아요
//  · 태블릿: 진짜 키보드를 연결했으면 타자 화면도 들어와요 (키보드 F·J 키로 확인)
// 화면과 서버가 같이 써요.

export type DeviceKind = "pc" | "tablet" | "phone";

/** 브라우저 이름표(User-Agent)로 본 휴대폰 (안드로이드 휴대폰은 "Mobile"이 들어가요) */
export function isPhoneUA(ua: string) {
  return /iPhone|iPod|Windows Phone|BlackBerry|Opera Mini|Mobi/i.test(ua);
}

/** 브라우저 이름표로 본 태블릿 */
function isTabletUA(ua: string) {
  return !isPhoneUA(ua) && /iPad|Android|Kindle|Silk|webOS/i.test(ua);
}

/** 이 기기가 무엇인지 (브라우저에서만 불러요) */
export function deviceKind(): DeviceKind {
  const ua = navigator.userAgent;
  if (isPhoneUA(ua)) return "phone";
  const touchOnly = matchMedia("(pointer: coarse)").matches && !matchMedia("(any-pointer: fine)").matches;
  // "데스크톱 사이트로 보기"를 켠 휴대폰: 화면이 작고 손가락으로만 써요
  if (touchOnly && Math.min(screen.width, screen.height) < 600) return "phone";
  // 데스크톱 모드 아이패드는 이름표가 맥처럼 보이지만 터치 화면이에요
  if (isTabletUA(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) || touchOnly) return "tablet";
  return "pc";
}

/** 키보드로 치는 화면 (휴대폰은 막고, 태블릿은 키보드 확인) */
const TYPING_PATHS = ["/practice", "/mission", "/placement", "/games", "/learn", "/explore/play"];

export const isTypingPath = (path: string) => TYPING_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export const PC_ONLY_MESSAGE = "타자 연습은 휴대폰으로는 할 수 없어요. 키보드가 있는 컴퓨터로 들어와 주세요!";
