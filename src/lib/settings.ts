"use client";

// 내 설정 (이 브라우저에만 저장): 디지털 눈, 효과음, 배경음악, 소리 크기.
// 학교 PC실은 시끄러울 수 있어서 소리는 처음엔 꺼져 있어요.

import { useSyncExternalStore } from "react";

export type Settings = {
  /** 타자 칠 때 방금 친 글자를 이진수로 보여 주기 */
  digitalEye: boolean;
  /** 효과음 (타닥 소리, 오타, 클리어) */
  sound: boolean;
  /** 배경음악 */
  bgm: boolean;
  /** 소리 크기 0~100 */
  volume: number;
};

const KEY = "tadak-settings";
export const DEFAULT_SETTINGS: Settings = { digitalEye: false, sound: false, bgm: false, volume: 50 };

let cached: Settings | null = null;
const listeners = new Set<() => void>();

function read(): Settings {
  if (cached) return cached;
  try {
    const raw = window.localStorage.getItem(KEY);
    cached = { ...DEFAULT_SETTINGS, ...(raw ? (JSON.parse(raw) as Partial<Settings>) : {}) };
  } catch {
    cached = DEFAULT_SETTINGS;
  }
  return cached;
}

export function getSettings(): Settings {
  return typeof window === "undefined" ? DEFAULT_SETTINGS : read();
}

export function updateSettings(patch: Partial<Settings>) {
  cached = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    // 저장이 막힌 브라우저: 이번 화면에서만 적용
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
