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

/* ───────────── 반 미니룸 (반 지갑으로, 투표로 사기) ───────────── */
// 반 지갑 버는 속도 참고(game.ts): 오늘의 미션 1명당 5 → 30명 반이 다 하면 하루 150 안팎

export const ROOM = {
  /** 반 인원 중 이만큼이 찬성하면 사요 (0.3 = 30%) */
  voteRatio: 0.3,
  /** 인원이 적어도 최소 이만큼은 찬성해야 해요 */
  minVotes: 3,
  /** 한 반에 동시에 열려 있을 수 있는 추천 수 */
  maxOpen: 6,
  /** 한 학생이 동시에 올릴 수 있는 추천 수 */
  maxOpenPerStudent: 1,
} as const;

/** 미니룸 크기 (픽셀 칸). 벽은 위쪽 0~60, 바닥은 60~100 */
export const ROOM_W = 160;
export const ROOM_H = 100;
export const ROOM_WALL_H = 60;

export type RoomItem = {
  id: string;
  name: string;
  price: number;
  /** wall·floor 는 벽지·바닥 (가장 최근 것이 보여요), furniture 는 정해진 자리에 놓여요 */
  kind: "wall" | "floor" | "furniture";
  /** 그림 이름 (ROOM_ART 또는 ROOM_SURFACES 키) */
  art: string;
  /** 가구가 놓이는 자리 (왼쪽 위, 픽셀 칸) */
  at?: [number, number];
};

export const ROOM_ITEMS: readonly RoomItem[] = [
  { id: "wall-cream", name: "크림 체크 벽지", price: 0, kind: "wall", art: "wall-cream" },
  { id: "wall-sky", name: "하늘 줄무늬 벽지", price: 200, kind: "wall", art: "wall-sky" },
  { id: "wall-pink", name: "분홍 체크 벽지", price: 200, kind: "wall", art: "wall-pink" },
  { id: "wall-night", name: "별밤 벽지", price: 300, kind: "wall", art: "wall-night" },
  { id: "floor-wood", name: "나무 마루", price: 0, kind: "floor", art: "floor-wood" },
  { id: "floor-grass", name: "잔디 바닥", price: 200, kind: "floor", art: "floor-grass" },
  { id: "floor-tile", name: "체크 타일", price: 200, kind: "floor", art: "floor-tile" },
  { id: "room-window", name: "창문", price: 150, kind: "furniture", art: "window", at: [10, 12] },
  { id: "room-clock", name: "벽시계", price: 100, kind: "furniture", art: "clock", at: [76, 8] },
  { id: "room-poster", name: "코딩 포스터", price: 150, kind: "furniture", art: "poster", at: [100, 18] },
  { id: "room-plant", name: "화분", price: 100, kind: "furniture", art: "plant", at: [3, 52] },
  { id: "room-sofa", name: "분홍 소파", price: 300, kind: "furniture", art: "sofa", at: [28, 53] },
  { id: "room-lamp", name: "스탠드", price: 150, kind: "furniture", art: "lamp", at: [62, 50] },
  { id: "room-computer", name: "컴퓨터 책상", price: 300, kind: "furniture", art: "computer", at: [96, 48] },
  { id: "room-bookshelf", name: "책장", price: 250, kind: "furniture", art: "bookshelf", at: [136, 46] },
  { id: "room-trophy", name: "우리 반 트로피", price: 500, kind: "furniture", art: "trophy", at: [140, 34] },
  { id: "room-rug", name: "보라 러그", price: 200, kind: "furniture", art: "rug", at: [60, 91] },
];

export const roomItem = (id: string | undefined) => ROOM_ITEMS.find((i) => i.id === id);
