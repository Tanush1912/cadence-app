"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { isScheduledOn } from "@/lib/utils/frequency";
import { GROUP_ORDER } from "@/lib/constants";
import type { Habit, GroupName } from "@/lib/types";

export function useHabits(dateKey: string) {
  const { habits: rawHabits, habitsLoading } = useSharedData();

  const habits = useMemo(() => {
    return Object.values(rawHabits)
      .filter((h) => !h.archived && isScheduledOn(h.frequency, dateKey))
      .sort((a, b) => {
        const gi = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
        if (gi !== 0) return gi;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [rawHabits, dateKey]);

  const grouped = useMemo(() => {
    const groups: Record<GroupName, Habit[]> = {
      morning: [],
      evening: [],
      anytime: [],
    };
    for (const habit of habits) {
      groups[habit.group]?.push(habit);
    }
    return groups;
  }, [habits]);

  return { habits, grouped, loading: habitsLoading };
}
