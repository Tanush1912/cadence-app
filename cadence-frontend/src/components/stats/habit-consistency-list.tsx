"use client";

import { cn } from "@/lib/utils";
import type { HabitStat } from "@/lib/hooks/use-stats";

const GROUP_BAR_COLORS: Record<string, string> = {
  morning: "bg-teal-400",
  evening: "bg-amber-400",
  anytime: "bg-rose-400",
};

const GROUP_BAR_BG: Record<string, string> = {
  morning: "bg-teal-400/15",
  evening: "bg-amber-400/15",
  anytime: "bg-rose-400/15",
};

export function HabitConsistencyList({ habits }: { habits: HabitStat[] }) {
  if (habits.length === 0) {
    return (
      <div className="bg-[#141414] rounded-2xl border border-[#262626] px-4 py-8 text-center text-[#737373] text-sm">
        No habits tracked yet.
      </div>
    );
  }

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#262626] divide-y divide-[#262626] overflow-hidden">
      {habits.map((habit, i) => (
        <div key={habit.id} className="px-4 py-3.5 flex items-center gap-3">
          {/* Rank */}
          <span className="text-xs font-mono text-[#737373] w-5 text-right shrink-0">
            {i + 1}
          </span>

          {/* Emoji */}
          <span className="text-lg shrink-0">{habit.emoji}</span>

          {/* Name + bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-[#fafafa] truncate">
                {habit.name}
                {habit.hasFrictionWarning && (
                  <span className="ml-1.5 text-amber-400" title="High friction">
                    ⚠
                  </span>
                )}
              </span>
              <span className="text-xs font-mono text-[#737373] ml-2 shrink-0">
                {habit.completionRate}%
              </span>
            </div>
            <div
              className={cn(
                "h-1.5 rounded-full w-full",
                GROUP_BAR_BG[habit.group] || GROUP_BAR_BG.anytime
              )}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  GROUP_BAR_COLORS[habit.group] || GROUP_BAR_COLORS.anytime
                )}
                style={{ width: `${Math.max(habit.completionRate, 1)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
