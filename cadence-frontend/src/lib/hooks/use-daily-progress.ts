"use client";

import { useMemo } from "react";
import type { Habit, Log } from "@/lib/types";

export function useDailyProgress(
  habits: Habit[],
  logs: Record<string, Log>
) {
  return useMemo(() => {
    const total = habits.length;
    const completed = habits.filter((h) => logs[h.id]?.done).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  }, [habits, logs]);
}
