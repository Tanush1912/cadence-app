"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { isScheduledOn } from "@/lib/utils/frequency";
import { addDays, todayKey } from "@/lib/utils/dates";
import { existedOn } from "./use-streaks";
import { GROUP_ORDER } from "@/lib/constants";
import { isQuitHabit, type Habit, type GroupName } from "@/lib/types";

export function useHabits(dateKey: string) {
  const { habits: rawHabits, habitsLoading } = useSharedData();

  const habits = useMemo(() => {
    return Object.values(rawHabits)
      .filter((h) => !h.archived && (isQuitHabit(h) || isScheduledOn(h.frequency, dateKey)))
      .sort((a, b) => {
        const gi = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
        if (gi !== 0) return gi;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [rawHabits, dateKey]);

  const buildHabits = useMemo(() => habits.filter((h) => !isQuitHabit(h)), [habits]);
  const quitHabits = useMemo(() => habits.filter((h) => isQuitHabit(h)), [habits]);

  const grouped = useMemo(() => {
    const groups: Record<GroupName, Habit[]> = {
      morning: [],
      evening: [],
      anytime: [],
    };
    for (const habit of buildHabits) {
      groups[habit.group]?.push(habit);
    }
    return groups;
  }, [buildHabits]);

  return { habits, buildHabits, quitHabits, grouped, loading: habitsLoading };
}

export interface QuitHistory {
  /** One entry per day, oldest first: true where a slip was logged. */
  slips: boolean[];
  /** Index of the first day the habit existed. Earlier cells render as untracked. */
  activeFrom: number;
}

/** Slip history for the card grid. Days before createdAt are untracked, not clean. */
export function useQuitHistory(habits: Habit[], days: number = 56): Record<string, QuitHistory> {
  const { logs } = useSharedData();

  return useMemo(() => {
    const today = todayKey();
    const out: Record<string, QuitHistory> = {};

    for (const habit of habits) {
      if (!isQuitHabit(habit)) continue;

      const slips: boolean[] = [];
      let activeFrom = days;

      for (let i = days - 1; i >= 0; i--) {
        const dateKey = addDays(today, -i);
        const index = days - 1 - i;
        const existed = existedOn(habit, dateKey);
        if (existed && index < activeFrom) activeFrom = index;
        slips.push(existed && !!logs[dateKey]?.[habit.id]?.slipped);
      }

      out[habit.id] = { slips, activeFrom };
    }

    return out;
  }, [habits, days, logs]);
}
