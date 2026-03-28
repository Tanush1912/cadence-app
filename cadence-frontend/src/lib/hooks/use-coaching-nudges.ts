"use client";

import { useMemo, useEffect, useRef } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { useGun } from "@/lib/gun/gun-provider";
import { todayKey, addDays, fromDateKey } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";
import type { Habit } from "@/lib/types";

export interface CoachingNudge {
  habitId: string;
  type: "suggest-smaller" | "dropped" | "personal-best" | "consistent" | "dependency";
  message: string;
  actions?: { label: string; type: "edit" | "archive" | "dismiss" }[];
}

const PRIORITY: Record<CoachingNudge["type"], number> = {
  dropped: 0,
  "suggest-smaller": 1,
  dependency: 2,
  "personal-best": 3,
  consistent: 4,
};

export function useCoachingNudges(
  dependencies?: { sourceId: string; sourceName: string; targetId: string; impact: number }[]
): Record<string, CoachingNudge | null> {
  const { habits: rawHabits, logs: allLogs, logsLoaded } = useSharedData();
  const gun = useGun();
  const dismissals = useRef<Record<string, { type: string; dismissedAt: string }>>({});

  // Load dismissals from GunDB
  useEffect(() => {
    if (!gun) return;
    gun.get("nudges").map().on((data: Record<string, unknown> | null, habitId: string) => {
      if (data && typeof data === "object") {
        dismissals.current[habitId] = {
          type: (data.type as string) || "",
          dismissedAt: (data.dismissedAt as string) || "",
        };
      }
    });
  }, [gun]);

  return useMemo(() => {
    if (!logsLoaded) return {};

    const habits = Object.values(rawHabits).filter((h) => !h.archived);
    const today = todayKey();
    const nudges: Record<string, CoachingNudge> = {};

    for (const h of habits) {
      // Skip habits created less than 7 days ago
      if (h.createdAt && Date.now() - h.createdAt < 7 * 86400000) continue;

      // Check cooldown (3 days)
      const dismissal = dismissals.current[h.id];
      if (dismissal?.dismissedAt) {
        const daysSince = Math.floor(
          (fromDateKey(today).getTime() - fromDateKey(dismissal.dismissedAt).getTime()) / 86400000
        );
        if (daysSince < 3) continue;
      }

      // Compute recent vs prior stats
      let recent7Done = 0, recent7Scheduled = 0;
      let prior7Done = 0, prior7Scheduled = 0;
      let frictionSum = 0, frictionCount = 0;
      let currentStreak = 0, bestStreak = 0, tempStreak = 0;

      for (let i = 1; i <= 14; i++) {
        const dk = addDays(today, -i);
        if (h.createdAt && fromDateKey(dk).getTime() < h.createdAt) continue;
        if (!isScheduledOn(h.frequency, dk)) continue;

        const log = allLogs[dk]?.[h.id];
        const done = !!log?.done;

        if (i <= 7) {
          recent7Scheduled++;
          if (done) recent7Done++;
          if (log?.friction && log.friction > 0) {
            frictionSum += log.friction;
            frictionCount++;
          }
        } else {
          prior7Scheduled++;
          if (done) prior7Done++;
        }
      }

      // Streak calculation
      for (let i = 1; i <= 90; i++) {
        const dk = addDays(today, -i);
        if (h.createdAt && fromDateKey(dk).getTime() < h.createdAt) break;
        if (!isScheduledOn(h.frequency, dk)) continue;
        if (allLogs[dk]?.[h.id]?.done) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          if (currentStreak === 0 && tempStreak > 0) currentStreak = tempStreak;
          tempStreak = 0;
        }
      }
      if (currentStreak === 0) currentStreak = tempStreak;

      const recentRate = recent7Scheduled > 0 ? (recent7Done / recent7Scheduled) * 100 : -1;
      const priorRate = prior7Scheduled > 0 ? (prior7Done / prior7Scheduled) * 100 : -1;
      const avgFriction = frictionCount > 0 ? frictionSum / frictionCount : 0;

      // 0. Dead habit — <10% for 14+ days, no improvement
      if (recentRate >= 0 && recentRate < 10 && priorRate >= 0 && priorRate < 20) {
        nudges[h.id] = {
          habitId: h.id,
          type: "dropped",
          message: "inactive",
          actions: [{ label: "archive", type: "archive" }],
        };
        continue;
      }

      // 1. Dropped — inactive lately (was active, now dropped)
      if (recentRate >= 0 && recentRate < 20 && priorRate > 60) {
        nudges[h.id] = {
          habitId: h.id,
          type: "dropped",
          message: "inactive lately",
          actions: [
            { label: "keep", type: "dismiss" },
            { label: "archive", type: "archive" },
          ],
        };
        continue;
      }

      // 2. Suggest smaller — high friction
      if (avgFriction >= 2.5 && frictionCount >= 5 && h.floor) {
        nudges[h.id] = {
          habitId: h.id,
          type: "suggest-smaller",
          message: `\u2193 try ${h.floor}`,
          actions: [{ label: "edit", type: "edit" }],
        };
        continue;
      }

      // 3. Personal best streak
      if (currentStreak > 0 && currentStreak > bestStreak) {
        nudges[h.id] = {
          habitId: h.id,
          type: "personal-best",
          message: "personal best",
        };
        continue;
      }

      // 4. Getting consistent
      if (recentRate >= 0 && priorRate >= 0 && (recentRate - priorRate) >= 15 && avgFriction < 2) {
        nudges[h.id] = {
          habitId: h.id,
          type: "consistent",
          message: "getting consistent",
        };
        continue;
      }
    }

    // 5. Dependency nudges — if habit B is decaying and A boosts it
    if (dependencies) {
      for (const dep of dependencies) {
        const targetHabit = habits.find((h) => h.id === dep.targetId);
        if (!targetHabit) continue;
        if (nudges[dep.targetId]) continue; // Don't override higher-priority nudge

        // Check if target is decaying
        let targetRecent = 0, targetScheduled = 0;
        for (let i = 1; i <= 7; i++) {
          const dk = addDays(today, -i);
          if (!isScheduledOn(targetHabit.frequency, dk)) continue;
          targetScheduled++;
          if (allLogs[dk]?.[dep.targetId]?.done) targetRecent++;
        }
        const targetRate = targetScheduled > 0 ? (targetRecent / targetScheduled) * 100 : 100;

        if (targetRate < 40 && dep.impact > 20) {
          nudges[dep.targetId] = {
            habitId: dep.targetId,
            type: "dependency",
            message: `\u2191 ${dep.sourceName.toLowerCase()} helps`,
          };
        }
      }
    }

    // Limit to max 2 nudges, sorted by priority
    const sorted = Object.values(nudges).sort(
      (a, b) => PRIORITY[a.type] - PRIORITY[b.type]
    );

    const result: Record<string, CoachingNudge | null> = {};
    for (let i = 0; i < Math.min(2, sorted.length); i++) {
      result[sorted[i].habitId] = sorted[i];
    }

    return result;
  }, [rawHabits, allLogs, logsLoaded, dependencies]);
}
