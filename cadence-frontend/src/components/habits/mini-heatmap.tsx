"use client";

import { cn } from "@/lib/utils";

/**
 * Mini heatmap grid showing completion history for a single habit.
 * Shows last N days as a grid of small squares.
 */
export function MiniHeatmap({
  data,
  accentColor = "teal",
  days = 56,
  columns = 14,
}: {
  data: boolean[];
  accentColor?: string;
  days?: number;
  columns?: number;
}) {
  const padded = Array(days).fill(false);
  const offset = days - data.length;
  for (let i = 0; i < data.length; i++) {
    padded[offset + i] = data[i];
  }

  const colorMap: Record<string, { active: string; inactive: string }> = {
    teal: { active: "bg-teal-400/80", inactive: "bg-teal-400/15" },
    amber: { active: "bg-amber-400/80", inactive: "bg-amber-400/15" },
    rose: { active: "bg-rose-400/80", inactive: "bg-rose-400/15" },
    purple: { active: "bg-violet-400/80", inactive: "bg-violet-400/15" },
    blue: { active: "bg-blue-400/80", inactive: "bg-blue-400/15" },
    green: { active: "bg-emerald-400/80", inactive: "bg-emerald-400/15" },
  };

  const colors = colorMap[accentColor] || colorMap.teal;

  return (
    <div
      className="grid gap-[2px] w-full"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {padded.map((active, i) => (
        <div
          key={i}
          className={cn(
            "aspect-square rounded-[2px]",
            active ? colors.active : colors.inactive
          )}
        />
      ))}
    </div>
  );
}
