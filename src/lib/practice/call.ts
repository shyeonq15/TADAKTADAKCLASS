// 서버 함수 부르기: 네트워크가 끊기거나 서버가 바뀌어도 화면이 멈추지 않고 안내가 뜨게 함

export const CALL_FAILED = "서버와 연결이 잠깐 끊겼어요. 새로고침(F5)하고 다시 해 주세요.";

export async function safeCall<T>(fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch {
    return { error: CALL_FAILED };
  }
}
