"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { todayKey, addDays } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";
import type { Habit } from "@/lib/types";

export interface FocusHabit {
  habit: Habit;
  reason: string;
  completionRate: number;
}

/**
 * Auto-select today's focus habit — the one most likely to be skipped.
 * Only returns a result if there's a clear candidate (consistency < 50% AND decaying or high friction).
 */
export function useFocusHabit(dateKey: string): FocusHabit | null {
  const { habits: rawHabits, logs: allLogs, logsLoaded } = useSharedData();

  return useMemo(() => {
    if (!logsLoaded) return null;

    const today = todayKey();
    const habits = Object.values(rawHabits).filter(
      (h) => !h.archived && isScheduledOn(h.frequency, dateKey)
    );

    if (habits.length === 0) return null;

    const habitData: {
      habit: Habit;
      recent7: number;
      prior7: number;
      avgFriction: number;
      completionRate: number;
    }[] = [];

    for (const h of habits) {
      let recent7Done = 0, recent7Scheduled = 0;
      let prior7Done = 0, prior7Scheduled = 0;
      let frictionSum = 0, frictionCount = 0;

      for (let i = 0; i < 14; i++) {
        const dk = addDays(today, -i);
        if (!isScheduledOn(h.frequency, dk)) continue;

        const log = allLogs[dk]?.[h.id];
        if (i < 7) {
          recent7Scheduled++;
          if (log?.done) recent7Done++;
        } else {
          prior7Scheduled++;
          if (log?.done) prior7Done++;
        }
        if (log?.friction && log.friction > 0) {
          frictionSum += log.friction;
          frictionCount++;
        }
      }

      const recentRate = recent7Scheduled > 0 ? (recent7Done / recent7Scheduled) * 100 : 100;
      const priorRate = prior7Scheduled > 0 ? (prior7Done / prior7Scheduled) * 100 : 100;
      const avgFriction = frictionCount > 0 ? frictionSum / frictionCount : 1;
      const isDecaying = priorRate >= 50 && (priorRate - recentRate) >= 20;
      const isHighFriction = avgFriction >= 2.5;

      if (recentRate < 50 && (isDecaying || isHighFriction)) {
        habitData.push({
          habit: h,
          recent7: recentRate,
          prior7: priorRate,
          avgFriction,
          completionRate: Math.round(recentRate),
        });
      }
    }

    if (habitData.length === 0) return null;

    const scored = habitData.map((d) => ({
      ...d,
      score: (100 - d.recent7) + (d.avgFriction * 20),
    }));

    const dayIndex = Math.floor(Date.now() / 86400000);
    scored.sort((a, b) => b.score - a.score);

    const pick = scored.length > 1 && (dayIndex % 4 === 0)
      ? scored[1]
      : scored[0];

    const reason = pick.prior7 > pick.recent7
      ? `consistency dropped to ${pick.completionRate}%`
      : `high friction lately`;

    return {
      habit: pick.habit,
      reason,
      completionRate: pick.completionRate,
    };
  }, [rawHabits, allLogs, logsLoaded, dateKey]);
}
