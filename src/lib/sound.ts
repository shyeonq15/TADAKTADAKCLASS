"use client";

// 8비트 느낌 효과음·배경음악 (파일 없이 브라우저 소리 합성기로 만들어요). 설정에서 켠 학생만 들려요.

import { getSettings } from "./settings";

export type SoundName = "key" | "error" | "pop" | "clear" | "levelup" | "miss";

let ctx: AudioContext | null = null;
function audio() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** 음 하나: 주파수(Hz), 길이(초), 시작(초 뒤), 파형 */
function tone(a: AudioContext, freq: number, dur: number, at = 0, type: OscillatorType = "square", gain = 1) {
  const vol = (getSettings().volume / 100) * 0.12 * gain;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = a.currentTime + at;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function play(name: SoundName) {
  if (!getSettings().sound) return;
  const a = audio();
  if (!a) return;
  switch (name) {
    case "key":
      return tone(a, 1800, 0.02, 0, "square", 0.25);
    case "error":
      return tone(a, 140, 0.12, 0, "sawtooth", 0.6);
    case "miss":
      tone(a, 330, 0.08, 0);
      return tone(a, 220, 0.14, 0.08);
    case "pop":
      return tone(a, 880, 0.06, 0, "square", 0.6);
    case "clear":
      [523, 659, 784, 1047].forEach((f, i) => tone(a, f, 0.14, i * 0.1));
      return;
    case "levelup":
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(a, f, 0.12, i * 0.08));
      return;
  }
}

/* ── 배경음악: 짧은 8비트 멜로디를 반복 ── */

const MELODY = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 988, 784, 659, 587];
let bgmTimer: number | null = null;

export function setBgm(on: boolean) {
  if (!on || !getSettings().bgm) {
    if (bgmTimer !== null) window.clearInterval(bgmTimer);
    bgmTimer = null;
    return;
  }
  if (bgmTimer !== null) return;
  let i = 0;
  bgmTimer = window.setInterval(() => {
    const a = audio();
    if (!a || !getSettings().bgm) return;
    tone(a, MELODY[i % MELODY.length], 0.22, 0, "triangle", 0.35);
    if (i % 4 === 0) tone(a, MELODY[i % MELODY.length] / 4, 0.3, 0, "square", 0.15);
    i++;
  }, 260);
}
