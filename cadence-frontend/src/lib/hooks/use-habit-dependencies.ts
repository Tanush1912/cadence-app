"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { todayKey, addDays } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";

export interface HabitDependency {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  impact: number;
  direction: "positive" | "negative";
  suggestion: string;
  confidence: "high" | "medium";
}

interface UseHabitDependenciesResult {
  boosters: HabitDependency[];
  breakers: HabitDependency[];
  loading: boolean;
}

export function useHabitDependencies(): UseHabitDependenciesResult {
  const { habits, logs, habitsLoading, logsLoaded } = useSharedData();

  return useMemo(() => {
    if (habitsLoading || !logsLoaded) {
      return { boosters: [], breakers: [], loading: true };
    }

    const activeHabits = Object.values(habits).filter((h) => !h.archived);
    if (activeHabits.length < 2) {
      return { boosters: [], breakers: [], loading: false };
    }

    // Build the 30-day window
    const today = todayKey();
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      days.push(addDays(today, -i));
    }

    const allDeps: HabitDependency[] = [];

    for (const source of activeHabits) {
      for (const target of activeHabits) {
        if (source.id === target.id) continue;

        let bothDone = 0;
        let aDoneAndBScheduled = 0;
        let bDoneWhenANotDone = 0;
        let aNotDoneAndBScheduled = 0;

        for (const day of days) {
          const sourceScheduled = isScheduledOn(source.frequency, day);
          const targetScheduled = isScheduledOn(target.frequency, day);
          if (!sourceScheduled || !targetScheduled) continue;

          const dayLogs = logs[day] || {};
          const aDone = !!dayLogs[source.id]?.done;
          const bDone = !!dayLogs[target.id]?.done;

          if (aDone) {
            aDoneAndBScheduled++;
            if (bDone) bothDone++;
          } else {
            aNotDoneAndBScheduled++;
            if (bDone) bDoneWhenANotDone++;
          }
        }

        // Filter: at least 5 samples in each condition
        if (aDoneAndBScheduled < 5 || aNotDoneAndBScheduled < 5) continue;

        const bRateWhenADone = (bothDone / aDoneAndBScheduled) * 100;
        const bRateWhenANotDone = (bDoneWhenANotDone / aNotDoneAndBScheduled) * 100;
        const impact = Math.round(bRateWhenADone - bRateWhenANotDone);

        if (Math.abs(impact) <= 20) continue;

        const direction: "positive" | "negative" = impact > 0 ? "positive" : "negative";
        const suggestion =
          direction === "positive"
            ? `do ${source.name.toLowerCase()} first`
            : `protect ${source.name.toLowerCase()} to keep ${target.name.toLowerCase()} consistent`;

        // High confidence = 10+ samples each, medium = 5-9
        const confidence = (aDoneAndBScheduled >= 10 && aNotDoneAndBScheduled >= 10) ? "high" as const : "medium" as const;

        allDeps.push({
          sourceId: source.id,
          sourceName: source.name,
          targetId: target.id,
          targetName: target.name,
          impact,
          direction,
          suggestion,
          confidence,
        });
      }
    }

    // Sort by absolute impact descending
    const boosters = allDeps
      .filter((d) => d.direction === "positive")
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3);

    const breakers = allDeps
      .filter((d) => d.direction === "negative")
      .sort((a, b) => a.impact - b.impact)
      .slice(0, 2);

    return { boosters, breakers, loading: false };
  }, [habits, logs, habitsLoading, logsLoaded]);
}
