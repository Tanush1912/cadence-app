"use client";

import { useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { todayKey, addDays, fromDateKey } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";
import { existedOn, quitStreak } from "./use-streaks";
import { isQuitHabit } from "@/lib/types";

const QUIT_WINDOW_DAYS = 182;

export interface HabitStat {
  id: string;
  name: string;
  emoji: string;
  group: "morning" | "evening" | "anytime";
  completionRate: number;
  scheduled: number;
  completed: number;
  hasFrictionWarning: boolean;
  decayWarning: { recent: number; prior: number } | null;
  longTermFriction: { weeks: number } | null;
}

export interface KeystoneHabit {
  id: string;
  name: string;
  emoji: string;
  completionWith: number;
  completionWithout: number;
  impact: number;
  confidence: "high" | "medium";
}

export interface HabitTiming {
  id: string;
  name: string;
  emoji: string;
  usualHour: number;
  usualLabel: string;
}

export interface DayCell {
  dateKey: string;
  completionPct: number;
  count: number;
  total: number;
}

export interface QuitCell {
  dateKey: string;
  slipped: boolean;
  tracked: boolean;
}

export interface QuitStat {
  id: string;
  name: string;
  cleanDays: number;
  cleanRate: number;
  trackedDays: number;
  slips: number;
  longestClean: number;
  cells: QuitCell[];
}

export interface StatsData {
  loading: boolean;
  daysTracked: number;
  avgCompletion: number;
  currentStreak: number;
  bestStreak: number;
  bestDay: string;
  worstDay: string;
  habitStats: HabitStat[];
  heatmapCells: DayCell[];
  keystoneHabits: KeystoneHabit[];
  habitTimings: HabitTiming[];
  quitStats: QuitStat[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EMPTY_STATS: StatsData = {
  loading: false,
  daysTracked: 0,
  avgCompletion: 0,
  currentStreak: 0,
  bestStreak: 0,
  bestDay: "-",
  worstDay: "-",
  habitStats: [],
  heatmapCells: [],
  keystoneHabits: [],
  habitTimings: [],
  quitStats: [],
};

function formatHour(h: number): string {
  if (h === 0) return "~12am";
  if (h < 12) return `~${h}am`;
  if (h === 12) return "~12pm";
  return `~${h - 12}pm`;
}

export function useStats(): StatsData {
  const { habits: rawHabits, logs: allLogs, habitsLoading, logsLoaded } = useSharedData();

  return useMemo(() => {
    if (habitsLoading || !logsLoaded) return { ...EMPTY_STATS, loading: true };

    const active = Object.values(rawHabits).filter((h) => !h.archived);
    if (active.length === 0) return EMPTY_STATS;

    const today = todayKey();

    // Quit habits are measured as days clean, never as a completion rate, so they are
    // held out of every build metric below rather than reading as 0% forever.
    const habits = active.filter((h) => !isQuitHabit(h));
    const quitHabits = active.filter((h) => isQuitHabit(h));

    const quitStats: QuitStat[] = quitHabits
      .map((h) => {
        let trackedDays = 0;
        let slips = 0;
        let longestClean = 0;
        let run = 0;

        const cells: QuitCell[] = [];
        for (let i = QUIT_WINDOW_DAYS - 1; i >= 0; i--) {
          const dateKey = addDays(today, -i);
          const tracked = existedOn(h, dateKey);
          const slipped = tracked && !!allLogs[dateKey]?.[h.id]?.slipped;

          if (tracked) {
            trackedDays++;
            if (slipped) {
              slips++;
              run = 0;
            } else {
              run++;
              if (run > longestClean) longestClean = run;
            }
          }

          cells.push({ dateKey, slipped, tracked });
        }

        return {
          id: h.id,
          name: h.name,
          cleanDays: quitStreak(h, allLogs, today).clean,
          cleanRate: trackedDays > 0 ? Math.round(((trackedDays - slips) / trackedDays) * 100) : 100,
          trackedDays,
          slips,
          longestClean,
          cells,
        };
      })
      .sort((a, b) => b.cleanRate - a.cleanRate);

    if (habits.length === 0) return { ...EMPTY_STATS, quitStats };

    const dateKeys: string[] = [];
    for (let i = 364; i >= 0; i--) dateKeys.push(addDays(today, -i));

    const dayCells: DayCell[] = [];
    const dayOfWeekTotals = new Array(7).fill(0);
    const dayOfWeekCompleted = new Array(7).fill(0);
    let totalDaysTracked = 0;
    let completionSum = 0;
    let completionDays = 0;

    const habitScheduled: Record<string, number> = {};
    const habitCompleted: Record<string, number> = {};
    const habitFrictionDays: Record<string, number> = {};

    const habitRecent7: Record<string, { scheduled: number; completed: number }> = {};
    const habitPrior7: Record<string, { scheduled: number; completed: number }> = {};

    const keystoneWith: Record<string, { totalPct: number; count: number }> = {};
    const keystoneWithout: Record<string, { totalPct: number; count: number }> = {};

    const habitHours: Record<string, number[]> = {};

    for (const h of habits) {
      habitScheduled[h.id] = 0;
      habitCompleted[h.id] = 0;
      habitFrictionDays[h.id] = 0;
      habitRecent7[h.id] = { scheduled: 0, completed: 0 };
      habitPrior7[h.id] = { scheduled: 0, completed: 0 };
      keystoneWith[h.id] = { totalPct: 0, count: 0 };
      keystoneWithout[h.id] = { totalPct: 0, count: 0 };
      habitHours[h.id] = [];
    }

    const sevenDaysAgo = addDays(today, -7);
    const fourteenDaysAgo = addDays(today, -14);
    const thirtyDaysAgo = addDays(today, -30);

    for (const dateKey of dateKeys) {
      const dayLogs = allLogs[dateKey] || {};
      const scheduledHabits = habits.filter((h) => {
        if (h.createdAt && fromDateKey(dateKey).getTime() < h.createdAt) return false;
        return isScheduledOn(h.frequency, dateKey);
      });

      const scheduledCount = scheduledHabits.length;
      if (scheduledCount === 0) {
        dayCells.push({ dateKey, completionPct: 0, count: 0, total: 0 });
        continue;
      }

      const completedCount = scheduledHabits.filter((h) => dayLogs[h.id]?.done).length;
      const pct = Math.round((completedCount / scheduledCount) * 100);
      dayCells.push({ dateKey, completionPct: pct, count: completedCount, total: scheduledCount });

      if (completedCount > 0) totalDaysTracked++;
      completionSum += pct;
      completionDays++;

      const date = fromDateKey(dateKey);
      const dow = date.getDay();
      const isoDow = dow === 0 ? 6 : dow - 1;
      dayOfWeekTotals[isoDow] += scheduledCount;
      dayOfWeekCompleted[isoDow] += completedCount;

      for (const h of scheduledHabits) {
        habitScheduled[h.id]++;
        const log = dayLogs[h.id];
        const done = !!log?.done;
        if (done) habitCompleted[h.id]++;

        if (dateKey > sevenDaysAgo) {
          habitRecent7[h.id].scheduled++;
          if (done) habitRecent7[h.id].completed++;
        } else if (dateKey > fourteenDaysAgo) {
          habitPrior7[h.id].scheduled++;
          if (done) habitPrior7[h.id].completed++;
        }

        if (dateKey >= fourteenDaysAgo && log && log.friction !== null && log.friction >= 3) {
          habitFrictionDays[h.id]++;
        }

        if (dateKey >= thirtyDaysAgo) {
          if (done) {
            keystoneWith[h.id].totalPct += pct;
            keystoneWith[h.id].count++;
          } else {
            keystoneWithout[h.id].totalPct += pct;
            keystoneWithout[h.id].count++;
          }
        }

        if (done && log?.completedAt) {
          const hour = new Date(log.completedAt).getHours();
          habitHours[h.id].push(hour);
        }
      }
    }

    const avgCompletion = completionDays > 0 ? Math.round(completionSum / completionDays) : 0;

    const goalPct = 70;
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (const cell of dayCells) {
      if (cell.total === 0) continue;
      if (cell.completionPct >= goalPct) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    for (let i = dayCells.length - 1; i >= 0; i--) {
      const cell = dayCells[i];
      if (cell.total === 0) continue;
      if (cell.completionPct >= goalPct) currentStreak++;
      else break;
    }

    const dayRates = dayOfWeekTotals.map((total, i) =>
      total > 0 ? dayOfWeekCompleted[i] / total : -1
    );
    let bestDayIdx = 0, worstDayIdx = 0, bestRate = -1, worstRate = 2;
    for (let i = 0; i < 7; i++) {
      if (dayRates[i] >= 0) {
        if (dayRates[i] > bestRate) { bestRate = dayRates[i]; bestDayIdx = i; }
        if (dayRates[i] < worstRate) { worstRate = dayRates[i]; worstDayIdx = i; }
      }
    }

    const habitStats: HabitStat[] = habits
      .map((h) => {
        const recentRate = habitRecent7[h.id].scheduled > 0
          ? Math.round((habitRecent7[h.id].completed / habitRecent7[h.id].scheduled) * 100)
          : 0;
        const priorRate = habitPrior7[h.id].scheduled > 0
          ? Math.round((habitPrior7[h.id].completed / habitPrior7[h.id].scheduled) * 100)
          : 0;
        const isDecaying = priorRate >= 50 && (priorRate - recentRate) >= 20;

        return {
          id: h.id,
          name: h.name,
          emoji: h.emoji,
          group: h.group,
          scheduled: habitScheduled[h.id],
          completed: habitCompleted[h.id],
          completionRate: habitScheduled[h.id] > 0
            ? Math.round((habitCompleted[h.id] / habitScheduled[h.id]) * 100)
            : 0,
          hasFrictionWarning: habitFrictionDays[h.id] >= 7,
          decayWarning: isDecaying ? { recent: recentRate, prior: priorRate } : null,
          longTermFriction: (() => {
            // Count consecutive weeks with avg friction >= 2.5
            let weeks = 0;
            for (let w = 0; w < 8; w++) {
              let wFrictionSum = 0, wFrictionCount = 0;
              for (let d = 0; d < 7; d++) {
                const dk = addDays(today, -(w * 7 + d + 1));
                const log = allLogs[dk]?.[h.id];
                if (log?.friction && log.friction > 0) {
                  wFrictionSum += log.friction;
                  wFrictionCount++;
                }
              }
              if (wFrictionCount >= 2 && (wFrictionSum / wFrictionCount) >= 2.5) {
                weeks++;
              } else {
                break;
              }
            }
            return weeks >= 3 ? { weeks } : null;
          })(),
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate);

    const keystoneHabits: KeystoneHabit[] = habits
      .map((h) => {
        const withCount = keystoneWith[h.id].count;
        const withoutCount = keystoneWithout[h.id].count;
        if (withCount < 5 || withoutCount < 5) return null;
        const avgWith = Math.round(keystoneWith[h.id].totalPct / withCount);
        const avgWithout = Math.round(keystoneWithout[h.id].totalPct / withoutCount);
        const impact = avgWith - avgWithout;
        if (impact <= 15) return null;
        // High confidence = 10+ samples each side, medium = 5-9
        const conf = (withCount >= 10 && withoutCount >= 10) ? "high" as const : "medium" as const;
        return {
          id: h.id,
          name: h.name,
          emoji: h.emoji,
          completionWith: avgWith,
          completionWithout: avgWithout,
          impact,
          confidence: conf,
        };
      })
      .filter((k): k is KeystoneHabit => k !== null)
      .sort((a, b) => b.impact - a.impact);

    const habitTimings: HabitTiming[] = habits
      .map((h) => {
        const hours = habitHours[h.id];
        if (hours.length < 3) return null;
        const counts = new Array(24).fill(0);
        for (const hr of hours) counts[hr]++;
        let modeHour = 0;
        let modeCount = 0;
        for (let i = 0; i < 24; i++) {
          if (counts[i] > modeCount) { modeCount = counts[i]; modeHour = i; }
        }
        return {
          id: h.id,
          name: h.name,
          emoji: h.emoji,
          usualHour: modeHour,
          usualLabel: formatHour(modeHour),
        };
      })
      .filter((t): t is HabitTiming => t !== null)
      .sort((a, b) => a.usualHour - b.usualHour);

    return {
      loading: false,
      daysTracked: totalDaysTracked,
      avgCompletion,
      currentStreak,
      bestStreak,
      bestDay: DAY_NAMES[bestDayIdx],
      worstDay: DAY_NAMES[worstDayIdx],
      habitStats,
      heatmapCells: dayCells,
      keystoneHabits,
      habitTimings,
      quitStats,
    };
  }, [rawHabits, allLogs, habitsLoading, logsLoaded]);
}
