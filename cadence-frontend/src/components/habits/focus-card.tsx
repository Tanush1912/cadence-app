"use client";

import type { FocusHabit } from "@/lib/hooks/use-focus-habit";
import { HabitIcon } from "@/lib/utils/habit-icons";

export function FocusCard({ focus }: { focus: FocusHabit }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
      style={{
        backgroundColor: "color-mix(in srgb, var(--primary) 5%, transparent)",
        borderColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
      }}
    >
      <span className="text-muted-foreground">
        <HabitIcon name={focus.habit.name} size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">focus (today)</p>
        <p className="text-sm font-medium truncate">{focus.habit.name}</p>
      </div>
      <span className="text-[11px] text-muted-foreground">{focus.reason}</span>
    </div>
  );
}
