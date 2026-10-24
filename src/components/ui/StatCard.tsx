/** DESIGN.md 6장 StatCard: 큰 숫자 + 라벨 + 내 평균 대비 변화 */
export function StatCard({
  label,
  value,
  unit,
  diff,
}: {
  label: string;
  value: string | number;
  unit?: string;
  /** 양수면 ▲(연두), 음수면 ▼(빨강). 0이나 없으면 표시 안 함 */
  diff?: { value: number; unit: string } | null;
}) {
  return (
    <div className="win-bevel-pressed flex-1 bg-paper px-4 py-2">
      <p className="font-pixel text-small text-text-muted">{label}</p>
      <p className="font-title text-stat text-navy-900">
        {value}
        {unit && <span className="ml-1 font-pixel text-small">{unit}</span>}
        {diff && diff.value !== 0 && (
          <span className={`ml-2 font-pixel text-small ${diff.value > 0 ? "text-lime-600" : "text-red-500"}`}>
            {diff.value > 0 ? "▲" : "▼"} {Math.abs(diff.value)}
            {diff.unit}
          </span>
        )}
      </p>
    </div>
  );
}
