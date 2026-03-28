"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { addDays, todayKey } from "@/lib/utils/dates";

/**
 * Get heatmap data for multiple habits from the shared cache.
 * No additional GunDB queries — pure derivation from cached logs.
 */
export function useAllHeatmapData(habitIds: string[], days: number = 56) {
  const { logs } = useSharedData();

  return useMemo(() => {
    const today = todayKey();
    const result: Record<string, boolean[]> = {};

    for (const id of habitIds) {
      const data: boolean[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const dateKey = addDays(today, -i);
        data.push(!!logs[dateKey]?.[id]?.done);
      }
      result[id] = data;
    }

    return result;
  }, [habitIds, days, logs]);
}
