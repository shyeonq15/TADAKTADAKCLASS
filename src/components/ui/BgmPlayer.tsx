"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";
import { setBgm } from "@/lib/sound";

/** 설정에서 배경음악을 켠 학생만 8비트 음악이 흘러요 (학생 화면 전체) */
export function BgmPlayer() {
  const { bgm } = useSettings();
  useEffect(() => {
    setBgm(bgm);
    return () => setBgm(false);
  }, [bgm]);
  return null;
}
