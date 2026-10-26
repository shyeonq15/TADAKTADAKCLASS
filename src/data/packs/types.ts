// 트랙 연습팩 JSON 모양 (src/data/packs/korean-track.json). 영타·기호·코드도 같은 모양으로 만들어요.
// 지문은 손으로 고치지 않고, 교사 검토표(docs/한글트랙_검토표.xlsx)에서 다시 만들어요.

import type { Tier, Track } from "@/config/game";

export type PassageSource = {
  unit?: string;
  page?: number;
  pages?: number[];
  match?: number;
  exact?: boolean;
  edits?: string[];
};

export type TrackPassage = {
  id: string;
  title?: string;
  text: string;
  chars: number;
  /** 두벌식 자모 입력 기준 타수 (타자 엔진 countKeystrokes 와 같은 규칙) */
  keystrokes: number;
  shiftKeys: number;
  compoundJamo: number;
  /** 지문 타수 ÷ 그 단계 목표 타수 × 60 */
  estSeconds: number;
  source: PassageSource | string;
};

export type TrackStage = {
  stage: number;
  targetTpm: number;
  title?: string;
  keys?: string;
  passages: TrackPassage[];
};

export type TrackTier = {
  id: Tier;
  name: string;
  icon: string;
  accuracy: number;
  contentType: string;
  targetRange: [number, number];
  round: { passagesPerRound: number; pick: "random"; targetSeconds: number };
  stages: TrackStage[];
};

export type TrackPack = {
  track: Track;
  trackName: string;
  version: number | string;
  notes: string[];
  tiers: TrackTier[];
};
