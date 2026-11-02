"use client";

import { PixelButton, PixelLink } from "@/components/ui/PixelButton";
import { RetroWindow } from "@/components/ui/RetroWindow";
import { updateSettings, useSettings, type Settings } from "@/lib/settings";
import { play } from "@/lib/sound";

const TOGGLES: { key: keyof Pick<Settings, "digitalEye" | "sound" | "bgm">; label: string; desc: string }[] = [
  { key: "digitalEye", label: "👁️ 디지털 눈", desc: "타자 칠 때 방금 친 글자가 컴퓨터 안에서 어떤 이진수인지 오른쪽 아래에 보여 줘요." },
  { key: "sound", label: "🔊 효과음", desc: "타닥 소리, 오타 소리, 클리어 소리. 이어폰을 끼고 켜 주세요!" },
  { key: "bgm", label: "🎵 배경음악", desc: "8비트 배경음악이 계속 흘러요." },
];

/** 내 설정 (이 컴퓨터 브라우저에만 저장돼요) */
export function SettingsPanel() {
  const s = useSettings();
  return (
    <div className="flex flex-col gap-4">
      <RetroWindow title="화면·소리">
        <ul className="flex flex-col gap-3 font-pixel text-body text-navy-900">
          {TOGGLES.map((t) => (
            <li key={t.key} className="flex items-start gap-3 border-b border-win-shadow pb-3">
              <label className="flex flex-1 cursor-pointer items-start gap-3">
                <input type="checkbox" checked={s[t.key]} onChange={(e) => updateSettings({ [t.key]: e.target.checked })} className="mt-1 size-5" />
                <span>
                  <strong>{t.label}</strong>
                  <span className="block text-small text-text-muted">{t.desc}</span>
                </span>
              </label>
            </li>
          ))}
          <li className="flex flex-wrap items-center gap-3">
            <strong>소리 크기</strong>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={s.volume}
              onChange={(e) => updateSettings({ volume: Number(e.target.value) })}
              aria-label="소리 크기"
              className="flex-1"
            />
            <span className="w-10 text-right">{s.volume}</span>
            <PixelButton size="sm" variant="ghost" onClick={() => play("clear")} disabled={!s.sound}>
              소리 들어 보기
            </PixelButton>
          </li>
        </ul>
        <p className="mt-3 font-pixel text-small text-text-muted">설정은 이 컴퓨터에만 저장돼요. 다른 PC나 디벗에서는 다시 켜 주세요.</p>
      </RetroWindow>
      <RetroWindow title="도움이 필요해요">
        <div className="flex flex-wrap gap-2">
          <PixelLink href="/feedback" variant="success" size="sm">
            📮 건의함 (버그·아이디어)
          </PixelLink>
          <PixelLink href="/help" variant="ghost" size="sm">
            도움말
          </PixelLink>
          <PixelLink href="/profile" variant="ghost" size="sm">
            내 프로필
          </PixelLink>
        </div>
      </RetroWindow>
    </div>
  );
}
