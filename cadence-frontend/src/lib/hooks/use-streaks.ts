"use client";

import { useCallback, useMemo, useRef } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { useSharedData } from "@/lib/gun/data-provider";
import { useGunMap } from "./use-gun-node";
import { addDays, fromDateKey, todayKey } from "@/lib/utils/dates";
import { isScheduledOn, getStreakType } from "@/lib/utils/frequency";
import { isQuitHabit, type Habit, type Streak } from "@/lib/types";

const MAX_WALK_DAYS = 365;

export interface QuitStreak {
  clean: number;
  lastSlip: string | null;
}

type SlipLogs = Record<string, Record<string, { slipped?: boolean } | undefined> | undefined>;

/** A day counts only if the habit existed for the whole of it. Every backwards walk needs this. */
export function existedOn(habit: { createdAt?: number }, dateKey: string): boolean {
  return !habit.createdAt || fromDateKey(dateKey).getTime() >= habit.createdAt;
}

/**
 * Consecutive days with no slip. A day with no log is a clean day, so the walk must
 * stop at habit.createdAt or every day before the habit existed counts as clean.
 */
export function quitStreak(
  habit: { id: string; createdAt?: number },
  logs: SlipLogs,
  today: string = todayKey()
): QuitStreak {
  let clean = 0;
  let dateKey = today;

  for (let checked = 0; checked < MAX_WALK_DAYS; checked++) {
    if (!existedOn(habit, dateKey)) break;
    if (logs[dateKey]?.[habit.id]?.slipped) return { clean, lastSlip: dateKey };
    clean++;
    dateKey = addDays(dateKey, -1);
  }

  return { clean, lastSlip: null };
}

/** A slip is the event itself, so it reads as a slip until a full day has passed. */
export function quitStreakLabel(
  streak: QuitStreak | undefined,
  today: string = todayKey()
): { text: string; broke: boolean } {
  if (!streak) return { text: "0 days clean", broke: false };
  if (streak.lastSlip === today) return { text: "Slipped today", broke: true };
  if (streak.lastSlip === addDays(today, -1)) return { text: "Slipped yesterday", broke: true };
  return { text: `${streak.clean} ${streak.clean === 1 ? "day" : "days"} clean`, broke: false };
}

export function useQuitStreaks(habits: Habit[]): Record<string, QuitStreak> {
  const { logs } = useSharedData();

  return useMemo(() => {
    const out: Record<string, QuitStreak> = {};
    for (const habit of habits) {
      if (isQuitHabit(habit)) out[habit.id] = quitStreak(habit, logs);
    }
    return out;
  }, [habits, logs]);
}

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
          const maxDays = MAX_WALK_DAYS;

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
