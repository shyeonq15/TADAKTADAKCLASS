// 개인정보 처리방침에 들어가는 학교별 값. 학교 상황에 맞게 여기만 고치면 처리방침 페이지가 바뀌어요.
// ⚠️ "확인 필요" 표시가 있는 값은 학교 개인정보 담당자(정보부·교감)와 꼭 확인한 뒤 바꿔 주세요.

export const PRIVACY = {
  /** 개인정보처리자(운영 주체) */
  operator: "수명중학교",
  service: "타닥타닥 우리반",
  /** 시행일 */
  effectiveDate: "2026-11-01",

  /** 개인정보 처리의 법적 근거 — 확인 필요 (학교 소관업무로 처리할지, 보호자 동의를 받을지) */
  legalBasis: "「개인정보 보호법」 제15조제1항제3호(공공기관의 소관 업무 수행) 및 「초·중등교육법」에 따른 교육과정 운영",
  /** 보호자(법정대리인) 동의를 받는 경우 true — 확인 필요 */
  guardianConsent: false,

  /** 개인정보 보호책임자 (학교의 개인정보 보호책임자, 보통 교감) — 확인 필요 */
  officer: { name: "○○○", title: "교감", phone: "02-000-0000", email: "" },
  /** 개인정보 담당 / 고충 처리 (운영 교사) */
  manager: { name: "정보 담당 교사", dept: "정보과", phone: "02-000-0000", email: "shyeon15@sen.go.kr" },

  /** 데이터 저장 위치 — Supabase 대시보드 Settings > General 의 Region 을 적어 주세요 (확인 필요) */
  dbRegion: "확인 필요(Supabase 프로젝트 지역)",
  /** 웹 서버(Vercel) 지역 */
  hostRegion: "미국(워싱턴 D.C., Vercel)",

  /** 보유 기간: 학년도가 끝나고 몇 개월 뒤에 지우는지 */
  keepMonthsAfterYear: 3,

  /** 이전 처리방침 (변경 시 추가) */
  history: [] as { from: string; to: string; url: string }[],
} as const;
