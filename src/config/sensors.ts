// 센서·액추에이터 분류 (2026-11-02, 교사 요청): 부품을 보고 아날로그/디지털 × 입력/출력을 골라요.
// 교과서·피지컬 컴퓨팅 수업 기준 (아두이노 analogRead/analogWrite, 마이크로비트 기준으로 설명). 부품은 여기서 더하거나 고쳐요.

export type IoKind = "ai" | "di" | "ao" | "do";

export const IO_KIND_LABELS: Record<IoKind, string> = {
  ai: "아날로그 입력",
  di: "디지털 입력",
  ao: "아날로그 출력",
  do: "디지털 출력",
};

export type Part = { name: string; icon: string; desc: string; kind: IoKind; why: string };

export const PARTS: readonly Part[] = [
  // 아날로그 입력: 값이 연속적으로 변해요 (0~1023 같은 여러 값)
  { name: "조도 센서", icon: "💡", desc: "주변 밝기를 재요", kind: "ai", why: "밝기가 조금씩 바뀌는 만큼 0~1023 같은 여러 값으로 읽어요." },
  { name: "온도 센서", icon: "🌡️", desc: "온도를 재요", kind: "ai", why: "온도는 연속적으로 변하는 값이라 여러 단계의 값으로 읽어요." },
  { name: "가변 저항(포텐셔미터)", icon: "🎛️", desc: "손잡이를 돌려 값을 바꿔요", kind: "ai", why: "돌린 정도에 따라 값이 부드럽게 바뀌어요." },
  { name: "토양 수분 센서", icon: "🪴", desc: "흙이 얼마나 촉촉한지 재요", kind: "ai", why: "젖은 정도가 조금씩 달라지는 값으로 나와요." },
  { name: "소리 크기 센서", icon: "🎤", desc: "주변 소리가 얼마나 큰지 재요", kind: "ai", why: "소리 크기는 작음~큼 사이의 여러 값이에요." },
  { name: "조이스틱", icon: "🕹️", desc: "얼마나 기울였는지 재요", kind: "ai", why: "조금 기울이면 작은 값, 많이 기울이면 큰 값이 나와요." },
  { name: "가스 센서", icon: "💨", desc: "공기 속 가스 양을 재요", kind: "ai", why: "가스 양에 따라 값이 연속적으로 달라져요." },
  // 디지털 입력: 0 또는 1 (눌림/안 눌림, 감지/미감지)
  { name: "푸시 버튼", icon: "🔘", desc: "누르면 신호가 들어가요", kind: "di", why: "눌렀다(1) / 안 눌렀다(0) 두 가지 상태뿐이에요." },
  { name: "터치 스위치", icon: "👆", desc: "손가락이 닿았는지 알아요", kind: "di", why: "닿았다 / 안 닿았다 두 가지로만 읽어요." },
  { name: "인체 감지(PIR) 센서", icon: "🚶", desc: "사람이 지나가는지 알아요", kind: "di", why: "사람이 있다(1) / 없다(0)로 알려 줘요." },
  { name: "기울기 스위치", icon: "📐", desc: "기울어졌는지 알아요", kind: "di", why: "기울었다 / 안 기울었다 두 상태만 있어요." },
  { name: "리드 스위치(자석 감지)", icon: "🧲", desc: "자석이 가까이 왔는지 알아요", kind: "di", why: "자석이 있다 / 없다 두 가지예요. 문 열림 감지에 써요." },
  { name: "적외선 장애물 감지 센서", icon: "🚧", desc: "앞에 물체가 있는지 알아요", kind: "di", why: "물체가 있다 / 없다로만 알려 주는 모듈이에요." },
  { name: "마이크로비트 A 버튼", icon: "🅰️", desc: "보드의 A 버튼", kind: "di", why: "눌림 / 안 눌림 두 가지 상태예요." },
  // 아날로그 출력: 세기·각도·속도를 여러 단계로 (아두이노 analogWrite, PWM)
  { name: "LED 밝기 조절", icon: "🔆", desc: "LED를 은은하게~밝게", kind: "ao", why: "0~255처럼 여러 단계로 밝기를 조절해요 (analogWrite)." },
  { name: "서보 모터", icon: "🦾", desc: "원하는 각도로 돌려요", kind: "ao", why: "0°~180° 사이 원하는 각도로 정할 수 있어요." },
  { name: "DC 모터 속도 조절", icon: "🌀", desc: "선풍기 바람 세기 조절", kind: "ao", why: "천천히~빠르게 여러 단계로 속도를 바꿔요." },
  { name: "피에조 부저 음높이", icon: "🎵", desc: "도레미 음을 연주해요", kind: "ao", why: "여러 높이의 소리를 낼 수 있어요." },
  { name: "RGB LED 색 섞기", icon: "🌈", desc: "빨강·초록·파랑을 섞어요", kind: "ao", why: "색마다 세기를 여러 단계로 정해 여러 색을 만들어요." },
  // 디지털 출력: 켜기/끄기 두 가지
  { name: "LED 켜기/끄기", icon: "🔴", desc: "LED를 켜거나 꺼요", kind: "do", why: "켜짐(1) / 꺼짐(0) 두 가지로만 내보내요 (digitalWrite)." },
  { name: "릴레이", icon: "🔌", desc: "큰 전기를 켜고 꺼요", kind: "do", why: "연결 / 끊김 두 상태로 스위치처럼 동작해요." },
  { name: "능동 부저", icon: "📢", desc: "삐— 소리를 내요", kind: "do", why: "소리 켜기 / 끄기 두 가지만 할 수 있어요." },
  { name: "레이저 모듈", icon: "🔦", desc: "레이저를 쏴요", kind: "do", why: "켜기 / 끄기 두 가지로만 동작해요." },
  { name: "전자석", icon: "🧷", desc: "철을 붙였다 놓았다 해요", kind: "do", why: "자석 켜기 / 끄기 두 상태예요." },
];

/** 한 판 문제 수 */
export const SENSOR_ROUND = 10;
