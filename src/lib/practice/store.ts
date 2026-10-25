"use client";

// 화면에서 연습 기록·진행 상황을 읽는 곳.
// 처음 값은 서버(학생 레이아웃)가 넣어 주고, 한 판을 저장하면 서버가 돌려준 새 값으로 바꿉니다.

import { createContext, createElement, useContext, useState, type ReactNode } from "react";
import { EMPTY_DATA, type PracticeData } from "./types";

type Ctx = { data: PracticeData; setData: (d: PracticeData) => void };

const PracticeContext = createContext<Ctx>({ data: EMPTY_DATA, setData: () => {} });

export function PracticeDataProvider({ initial, children }: { initial: PracticeData; children: ReactNode }) {
  const [data, setData] = useState(initial);
  return createElement(PracticeContext.Provider, { value: { data, setData } }, children);
}

export function usePracticeData(): PracticeData {
  return useContext(PracticeContext).data;
}

export function useSetPracticeData() {
  return useContext(PracticeContext).setData;
}

export { dayKeyKST as dayKey } from "./day";
export { recentMedian, streakDays, todayGrowth, weakKeys } from "./derive";
export type { Attempt, AttemptKind, PracticeData, Progress, SaveResult } from "./types";
