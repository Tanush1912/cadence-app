"use client";

export function DailyProgressBar({
  completed,
  total,
  percentage,
  goal,
}: {
  completed: number;
  total: number;
  percentage: number;
  goal: number;
}) {
  if (total === 0) return null;

  const goalMet = percentage >= goal * 100;

  return (
    <div className="px-5 py-3 bg-[#0a0a0a] border-t border-[#1a1a1a]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">
          {completed}/{total} completed
        </span>
        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: goalMet ? "var(--primary)" : "#737373" }}
        >
          {percentage}%
        </span>
      </div>
      <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: "var(--primary)",
          }}
        />
      </div>
    </div>
  );
}
