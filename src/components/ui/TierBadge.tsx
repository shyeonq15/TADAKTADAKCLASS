import { TIER_LABELS, type Tier } from "@/config/game";

const TIER_STYLE: Record<Tier, { bg: string; icon: string }> = {
  bronze: { bg: "#c27b4a", icon: "◆" },
  silver: { bg: "#b8c2cc", icon: "◆" },
  gold: { bg: "var(--yellow-400)", icon: "♛" },
  diamond: { bg: "var(--sky-500)", icon: "◇" },
  master: { bg: "var(--pink-400)", icon: "★" },
  legend: { bg: "var(--yellow-400)", icon: "👑" },
};

/** DESIGN.md 6장 TierBadge (임시 글자 아이콘, 정식 픽셀 배지는 나중에) */
export function TierBadge({ tier, codeMaster = false }: { tier: Tier; codeMaster?: boolean }) {
  if (codeMaster) {
    return (
      <span className="inline-flex items-center gap-1 border-3 border-navy-900 bg-lime-400 px-2 font-pixel text-small font-bold text-navy-900">
        &lt;/&gt; 코드 마스터
      </span>
    );
  }
  const s = TIER_STYLE[tier];
  return (
    <span
      className={`inline-flex items-center gap-1 border-3 px-2 font-pixel text-small font-bold text-navy-900 ${
        tier === "legend" ? "border-ink shadow-[2px_2px_0_var(--pink-400)]" : "border-navy-900"
      }`}
      style={{ background: s.bg }}
    >
      {s.icon} {TIER_LABELS[tier]}
    </span>
  );
}
