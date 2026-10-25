// 상점 아이템 목록과 가격. 가격은 시범 2주 데이터를 보고 여기서만 바꿔요. (CLAUDE.md 9장: 아직 정하지 않은 것)
//
// 코인 버는 속도 참고(game.ts): 오늘의 미션 30 · 연습 한 판 2 · 개인 기록 10 · 게임 3~20
// → 하루 열심히 하면 50코인 안팎. 기본 아이템은 하루~이틀, 티어 한정 아이템은 1~2주 모으면 살 수 있게.

import type { Tier } from "./game";

export const MINIMI_SLOTS = ["fur", "hat", "face", "neck"] as const;
export type MinimiSlot = (typeof MINIMI_SLOTS)[number];

export const SLOT_LABELS: Record<MinimiSlot, string> = {
  fur: "털 색",
  hat: "모자",
  face: "얼굴",
  neck: "목",
};

/** 입고 있는 것. 비어 있으면 아무것도 안 씀 (털 색은 기본 크림) */
export type MinimiLook = Partial<Record<MinimiSlot, string>>;

/** 잠금 조건: 프로필 티어(네 트랙 중 가장 높은 티어) 이상, 또는 코드 마스터 칭호 */
export type ItemLock = { tier: Tier } | { codeMaster: true };

export type MinimiItem = {
  id: string;
  slot: MinimiSlot;
  name: string;
  price: number;
  /** 그림 이름 (털 색이면 FUR_COLORS 키, 나머지는 MINIMI_LAYERS 키) */
  art: string;
  lock?: ItemLock;
};

export const MINIMI_ITEMS: readonly MinimiItem[] = [
  // 털 색 (크림은 처음부터 가지고 있어요)
  { id: "fur-cream", slot: "fur", name: "크림 토끼", price: 0, art: "cream" },
  { id: "fur-sky", slot: "fur", name: "하늘 토끼", price: 60, art: "sky" },
  { id: "fur-pink", slot: "fur", name: "분홍 토끼", price: 60, art: "pink" },
  { id: "fur-mint", slot: "fur", name: "민트 토끼", price: 60, art: "mint" },
  { id: "fur-gray", slot: "fur", name: "회색 토끼", price: 60, art: "gray" },
  { id: "fur-choco", slot: "fur", name: "초코 토끼", price: 80, art: "choco" },
  { id: "fur-gold", slot: "fur", name: "황금 토끼", price: 300, art: "gold", lock: { tier: "diamond" } },
  // 모자
  { id: "hat-ribbon", slot: "hat", name: "분홍 리본", price: 40, art: "ribbon" },
  { id: "hat-flower", slot: "hat", name: "귀에 꽃", price: 40, art: "flower" },
  { id: "hat-beanie", slot: "hat", name: "털모자", price: 70, art: "beanie" },
  { id: "hat-cap", slot: "hat", name: "빨간 모자", price: 70, art: "cap" },
  { id: "hat-wizard", slot: "hat", name: "마법사 모자", price: 200, art: "wizard", lock: { tier: "master" } },
  { id: "hat-crown", slot: "hat", name: "왕관", price: 300, art: "crown", lock: { tier: "legend" } },
  // 얼굴
  { id: "face-blush", slot: "face", name: "볼터치", price: 30, art: "blush" },
  { id: "face-star", slot: "face", name: "별 스티커", price: 40, art: "star" },
  { id: "face-glasses", slot: "face", name: "탐정 외알 안경", price: 80, art: "glasses" },
  { id: "face-shades", slot: "face", name: "선글라스", price: 100, art: "shades", lock: { tier: "silver" } },
  // 목
  { id: "neck-bowtie", slot: "neck", name: "나비넥타이", price: 50, art: "bowtie" },
  { id: "neck-scarf", slot: "neck", name: "빨간 목도리", price: 70, art: "scarf" },
  { id: "neck-medal", slot: "neck", name: "금메달", price: 150, art: "medal", lock: { tier: "gold" } },
  { id: "neck-codetag", slot: "neck", name: "코드 마스터 목걸이", price: 200, art: "codetag", lock: { codeMaster: true } },
];

export const minimiItem = (id: string | undefined) => MINIMI_ITEMS.find((i) => i.id === id);

/** 처음부터 가지고 있는 아이템 (가격 0) */
export const FREE_ITEMS = MINIMI_ITEMS.filter((i) => i.price === 0).map((i) => i.id);
