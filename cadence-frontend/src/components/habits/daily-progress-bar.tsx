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
    <div className="px-5 pb-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${percentage}%`,
              backgroundColor: "var(--primary)",
            }}
          />
        </div>
        <span
          className="text-[11px] font-medium tabular-nums shrink-0"
          style={{ color: goalMet ? "var(--primary)" : "#525252" }}
        >
          {completed}/{total}
        </span>
      </div>
    </div>
  );
}
