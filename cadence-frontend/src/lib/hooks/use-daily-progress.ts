"use client";

import { useMemo } from "react";
import { isQuitHabit, type Habit, type Log } from "@/lib/types";

/**
 * Quit habits are excluded from the ring: they start the day satisfied, so counting
 * them would open the ring part-full before the user had done anything. They are
 * reported alongside it as a held count instead, so the exclusion stays visible.
 */
export function useDailyProgress(
  habits: Habit[],
  logs: Record<string, Log>
) {
  return useMemo(() => {
    const build = habits.filter((h) => !isQuitHabit(h));
    const quit = habits.filter((h) => isQuitHabit(h));

    const total = build.length;
    const completed = build.filter((h) => logs[h.id]?.done).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const quitTotal = quit.length;
    const quitHeld = quit.filter((h) => !logs[h.id]?.slipped).length;

    return { completed, total, percentage, quitTotal, quitHeld };
  }, [habits, logs]);
}
