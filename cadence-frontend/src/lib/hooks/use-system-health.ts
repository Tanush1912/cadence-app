"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { todayKey, addDays, fromDateKey } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";
import { isQuitHabit } from "@/lib/types";

export interface SystemHealth {
  score: number;
  status: "thriving" | "stable" | "declining" | "recovering";
  trend: "up" | "down" | "flat";
  shouldSimplify: boolean;
  factors: {
    completion: number;
    streaks: number;
    friction: number;
    decay: number;
  };
  loading: boolean;
}

const EMPTY: SystemHealth = {
  score: 0,
  status: "stable",
  trend: "flat",
  shouldSimplify: false,
  factors: { completion: 0, streaks: 0, friction: 0, decay: 0 },
  loading: true,
};

export function useSystemHealth(): SystemHealth {
  const { habits: rawHabits, logs: allLogs, habitsLoading, logsLoaded } = useSharedData();

  return useMemo(() => {
    if (habitsLoading || !logsLoaded) return EMPTY;

    const habits = Object.values(rawHabits).filter((h) => !h.archived && !isQuitHabit(h));
    if (habits.length === 0) return { ...EMPTY, loading: false };

    // Need at least 3 days of log data to compute a meaningful score
    const logDays = Object.keys(allLogs).length;
    if (logDays < 3) return { ...EMPTY, loading: false, score: -1 };

    const today = todayKey();

    let recent7Scheduled = 0;
    let recent7Completed = 0;
    let prior7Scheduled = 0;
    let prior7Completed = 0;

    for (let i = 1; i <= 14; i++) {
      const dk = addDays(today, -i);
      const dayLogs = allLogs[dk] || {};
      const isRecent = i <= 7;

      for (const h of habits) {
        if (h.createdAt && fromDateKey(dk).getTime() < h.createdAt) continue;
        if (!isScheduledOn(h.frequency, dk)) continue;

        if (isRecent) {
          recent7Scheduled++;
          if (dayLogs[h.id]?.done) recent7Completed++;
        } else {
          prior7Scheduled++;
          if (dayLogs[h.id]?.done) prior7Completed++;
        }
      }
    }

    const recent7dAvg = recent7Scheduled > 0
      ? (recent7Completed / recent7Scheduled) * 100
      : 0;
    const prior7dAvg = prior7Scheduled > 0
      ? (prior7Completed / prior7Scheduled) * 100
      : 0;

    const completionScore = Math.min(100, (recent7dAvg / 70) * 100);

    let totalCurrentStreak = 0;
    let totalBestStreak = 0;

    for (const h of habits) {
      let current = 0;
      let best = 0;
      let temp = 0;

      for (let i = 90; i >= 1; i--) {
        const dk = addDays(today, -i);
        if (h.createdAt && fromDateKey(dk).getTime() < h.createdAt) continue;
        if (!isScheduledOn(h.frequency, dk)) continue;

        const done = allLogs[dk]?.[h.id]?.done;
        if (done) {
          temp++;
          best = Math.max(best, temp);
        } else {
          temp = 0;
        }
      }

      for (let i = 1; i <= 90; i++) {
        const dk = addDays(today, -i);
        if (h.createdAt && fromDateKey(dk).getTime() < h.createdAt) break;
        if (!isScheduledOn(h.frequency, dk)) continue;

        if (allLogs[dk]?.[h.id]?.done) {
          current++;
        } else {
          break;
        }
      }

      totalCurrentStreak += current;
      totalBestStreak += best;
    }

    const streakScore = totalBestStreak > 0
      ? Math.min(100, (totalCurrentStreak / totalBestStreak) * 100)
      : 50;

    let frictionSum = 0;
    let frictionCount = 0;

    for (let i = 1; i <= 7; i++) {
      const dk = addDays(today, -i);
      const dayLogs = allLogs[dk] || {};
      for (const h of habits) {
        const log = dayLogs[h.id];
        if (log?.friction !== null && log?.friction !== undefined) {
          frictionSum += log.friction;
          frictionCount++;
        }
      }
    }

    const avgFriction = frictionCount > 0 ? frictionSum / frictionCount : 1;
    const frictionScore = Math.max(0, 100 - (avgFriction * 25));

    let decayingHabitCount = 0;

    for (const h of habits) {
      let recentSched = 0, recentDone = 0;
      let priorSched = 0, priorDone = 0;

      for (let i = 1; i <= 14; i++) {
        const dk = addDays(today, -i);
        if (h.createdAt && fromDateKey(dk).getTime() < h.createdAt) continue;
        if (!isScheduledOn(h.frequency, dk)) continue;

        if (i <= 7) {
          recentSched++;
          if (allLogs[dk]?.[h.id]?.done) recentDone++;
        } else {
          priorSched++;
          if (allLogs[dk]?.[h.id]?.done) priorDone++;
        }
      }

      const recentRate = recentSched > 0 ? (recentDone / recentSched) * 100 : 0;
      const priorRate = priorSched > 0 ? (priorDone / priorSched) * 100 : 0;

      if (priorRate >= 50 && (priorRate - recentRate) >= 20) {
        decayingHabitCount++;
      }
    }

    const decayScore = Math.max(0, 100 - (decayingHabitCount * 20));

    const health = Math.round(
      completionScore * 0.4 +
      streakScore * 0.2 +
      frictionScore * 0.2 +
      decayScore * 0.2
    );

    const trendDiff = recent7dAvg - prior7dAvg;
    const trend: "up" | "down" | "flat" =
      trendDiff > 5 ? "up" : trendDiff < -5 ? "down" : "flat";

    let status: "thriving" | "stable" | "declining" | "recovering";
    if (health >= 80) {
      status = "thriving";
    } else if (health >= 60) {
      status = "stable";
    } else if (trend === "up") {
      status = "recovering";
    } else {
      status = "declining";
    }

    return {
      score: health,
      status,
      trend,
      shouldSimplify: health >= 0 && health < 40,
      factors: {
        completion: Math.round(completionScore),
        streaks: Math.round(streakScore),
        friction: Math.round(frictionScore),
        decay: Math.round(decayScore),
      },
      loading: false,
    };
  }, [rawHabits, allLogs, habitsLoading, logsLoaded]);
}
