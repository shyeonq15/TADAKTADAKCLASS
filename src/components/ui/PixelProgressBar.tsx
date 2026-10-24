/** DESIGN.md 6장 PixelProgressBar: 칸 단위로 한 칸씩 채워지는 막대 */
export function PixelProgressBar({ value, cells = 20, label }: { value: number; cells?: number; label?: string }) {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * cells);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="flex h-6 gap-0.5 border-3 border-navy-900 bg-sky-100 p-0.5"
    >
      {Array.from({ length: cells }, (_, i) => (
        <span key={i} className={`flex-1 ${i < filled ? "bg-lime-400" : ""}`} />
      ))}
    </div>
  );
}
