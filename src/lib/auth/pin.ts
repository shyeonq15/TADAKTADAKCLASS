import "server-only";
import { createHmac, randomInt } from "node:crypto";
import { authConfig } from "./config";

// PIN 로그인: 학생은 4자리 PIN만 기억하고, 실제 비밀번호는 서버 비밀값을 섞어 길게 만듭니다.
// 그래서 PIN을 알아도 우리 서버를 거치지 않고는 로그인할 수 없고, 서버에서 시도 횟수를 막습니다.

export const PIN_LOCK = { maxFailures: 5, windowMinutes: 10 } as const;

export function pinPassword(studentId: string, pin: string) {
  const { pinPepper } = authConfig();
  if (!pinPepper) throw new Error(".env.local 에 PIN_PEPPER 가 없어요.");
  return createHmac("sha256", pinPepper).update(`${studentId}:${pin}`).digest("base64url");
}

/** PIN 학생 계정의 로그인용 이메일 (실제로 메일을 보내지 않는 예약 도메인) */
export const pinEmail = (key: string) => `pin-${key}@students.example.com`;

export const newPin = () => String(randomInt(0, 10000)).padStart(4, "0");

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0 O 1 I 뺌
export const newJoinCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(0, CODE_CHARS.length)]).join("");

export const isPin = (s: string) => /^\d{4}$/.test(s);
