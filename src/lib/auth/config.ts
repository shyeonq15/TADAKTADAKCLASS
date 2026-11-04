import "server-only";

// 로그인 관련 설정 (.env.local). 학교가 바뀌면 여기 값만 바꿉니다.

export function authConfig() {
  return {
    schoolName: process.env.SCHOOL_NAME || "우리 학교",
    allowedDomain: (process.env.ALLOWED_EMAIL_DOMAIN || "").toLowerCase(),
    teacherEmails: (process.env.TEACHER_EMAILS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .map(teacherLoginEmail),
    pinPepper: process.env.PIN_PEPPER || "",
  };
}

/** 이메일 없이 아이디만 쓰는 선생님 계정의 내부 이메일 주소 (메일은 가지 않아요) */
export const TEACHER_ID_DOMAIN = "teachers.example.com";

/** 선생님 로그인 칸에 넣은 값 → 로그인 이메일. "science" 처럼 아이디만 쓰면 science@teachers.example.com */
export function teacherLoginEmail(input: string) {
  const v = input.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${TEACHER_ID_DOMAIN}`;
}

export const isTeacherEmail = (email: string) => authConfig().teacherEmails.includes(teacherLoginEmail(email));

/** 학교 도메인 계정이거나 교사 목록에 있으면 허용 */
export function isAllowedEmail(email: string) {
  const { allowedDomain } = authConfig();
  const e = email.toLowerCase();
  return isTeacherEmail(e) || (!!allowedDomain && e.endsWith(`@${allowedDomain}`));
}

/** 학년도: 3월에 바뀜 (2027년 2월은 2026학년도) */
export function schoolYearOf(d = new Date()) {
  return d.getMonth() + 1 >= 3 ? d.getFullYear() : d.getFullYear() - 1;
}
