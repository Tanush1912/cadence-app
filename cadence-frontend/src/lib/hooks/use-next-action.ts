"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { todayKey, addDays } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";
import { isQuitHabit } from "@/lib/types";

export interface NextAction {
  message: string;
  habitId?: string;
}

export function useNextAction(
  logs: Record<string, { done?: boolean }>,
  totalHabits: number,
  completedCount: number,
  dependencies?: { sourceId: string; sourceName: string; targetId: string; targetName: string; impact: number }[]
): NextAction | null {
  const { habits: rawHabits, logs: allLogs, logsLoaded } = useSharedData();

  return useMemo(() => {
    if (!logsLoaded) return null;

    const habits = Object.values(rawHabits).filter((h) => !h.archived && !isQuitHabit(h));
    if (habits.length === 0) return null;

    const today = todayKey();
    const hour = new Date().getHours();

    // 1. All done
    if (totalHabits > 0 && completedCount >= totalHabits) {
      return { message: "on track today" };
    }

    // 2. Booster habit not yet done
    if (dependencies && dependencies.length > 0) {
      for (const dep of dependencies) {
        if (!logs[dep.sourceId]?.done) {
          const targetDone = logs[dep.targetId]?.done;
          if (!targetDone) {
            return {
              message: `${dep.sourceName.toLowerCase()} first, it supports ${dep.targetName.toLowerCase()}`,
              habitId: dep.sourceId,
            };
          }
        }
      }
    }

    // 3. Decaying habit
    const scheduled = habits.filter((h) => isScheduledOn(h.frequency, today));
    for (const h of scheduled) {
      if (logs[h.id]?.done) continue;

      let recent7 = 0, sched7 = 0;
      let prior7 = 0, priorSched7 = 0;
      for (let i = 1; i <= 14; i++) {
        const dk = addDays(today, -i);
        if (!isScheduledOn(h.frequency, dk)) continue;
        if (i <= 7) {
          sched7++;
          if (allLogs[dk]?.[h.id]?.done) recent7++;
        } else {
          priorSched7++;
          if (allLogs[dk]?.[h.id]?.done) prior7++;
        }
      }

      const recentRate = sched7 > 0 ? (recent7 / sched7) * 100 : 100;
      const priorRate = priorSched7 > 0 ? (prior7 / priorSched7) * 100 : 100;

      if (priorRate >= 50 && (priorRate - recentRate) >= 20) {
        const floorHint = h.floor ? `, ${h.floor} is enough` : "";
        return {
          message: `${h.name.toLowerCase()} slipping${floorHint}`,
          habitId: h.id,
        };
      }
    }

    // 4. Time-based gentle nudge
    if (hour < 12 && completedCount === 0 && totalHabits > 0) {
      const morningHabit = scheduled.find((h) => h.group === "morning" && !logs[h.id]?.done);
      if (morningHabit) {
        return {
          message: `morning: ${morningHabit.name.toLowerCase()}`,
          habitId: morningHabit.id,
        };
      }
    }

    if (hour >= 18 && completedCount < totalHabits) {
      const eveningHabit = scheduled.find((h) => h.group === "evening" && !logs[h.id]?.done);
      if (eveningHabit) {
        return {
          message: `evening: ${eveningHabit.name.toLowerCase()}`,
          habitId: eveningHabit.id,
        };
      }
    }

    return null;
  }, [rawHabits, allLogs, logsLoaded, logs, totalHabits, completedCount, dependencies]);
}
