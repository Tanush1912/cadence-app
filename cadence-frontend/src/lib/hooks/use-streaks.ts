"use client";

import { useCallback, useRef } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { useGunMap } from "./use-gun-node";
import { addDays, todayKey } from "@/lib/utils/dates";
import { isScheduledOn, getStreakType } from "@/lib/utils/frequency";
import type { Streak } from "@/lib/types";

export function useStreaks() {
  const gun = useGun();
  const { data: rawStreaks, loading } = useGunMap<Record<string, unknown>>("streaks");
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const streaks: Record<string, Streak> = {};
  for (const [id, raw] of Object.entries(rawStreaks)) {
    streaks[id] = {
      current: (raw.current as number) ?? 0,
      best: (raw.best as number) ?? 0,
      type: (raw.type as "day" | "week") ?? "day",
    };
  }

  const recomputeStreak = useCallback(
    (habitId: string, frequency: string) => {
      if (!gun) return;

      if (debounceTimers.current[habitId]) {
        clearTimeout(debounceTimers.current[habitId]);
      }

      debounceTimers.current[habitId] = setTimeout(() => {
        const streakType = getStreakType(frequency);

        if (streakType === "day") {
          let current = 0;
          let dateKey = todayKey();
          let checked = 0;
          const maxDays = 365;

          const checkDay = (dk: string) => {
            return new Promise<boolean>((resolve) => {
              gun
                .get("logs")
                .get(dk)
                .get(habitId)
                .once((data: Record<string, unknown> | null) => {
                  resolve(!!data?.done);
                });
            });
          };

          const walk = async () => {
            while (checked < maxDays) {
              if (!isScheduledOn(frequency, dateKey)) {
                dateKey = addDays(dateKey, -1);
                checked++;
                continue;
              }

              const done = await checkDay(dateKey);
              if (done) {
                current++;
                dateKey = addDays(dateKey, -1);
                checked++;
              } else {
                break;
              }
            }

            const oldBest = (rawStreaks[habitId]?.best as number) ?? 0;
            const best = Math.max(current, oldBest);

            gun.get("streaks").get(habitId).put({
              current,
              best,
              type: streakType,
            });
          };

          walk();
        }
      }, 500);
    },
    [gun, rawStreaks]
  );

  return { streaks, loading, recomputeStreak };
}
