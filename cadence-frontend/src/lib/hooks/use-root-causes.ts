"use client";

import { useMemo, useEffect, useState } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { useSharedData } from "@/lib/gun/data-provider";
import { todayKey, addDays, fromDateKey } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";
import { stripGunMeta } from "@/lib/gun/gun-utils";

export interface RootCause {
  habitId: string;
  habitName: string;
  pattern: string;
  confidence: "high" | "medium";
  suggestion?: string;
}

const KEYWORDS: Record<string, string[]> = {
  tired: ["tired", "exhausted", "fatigue", "sleepy", "drained"],
  busy: ["busy", "hectic", "packed", "swamped", "overwhelmed"],
  sick: ["sick", "ill", "unwell", "cold", "fever", "headache"],
  travel: ["travel", "trip", "flight", "airport", "hotel"],
  late: ["late", "overslept", "slept in", "woke up late"],
  stressed: ["stressed", "stress", "anxious", "anxiety", "worried"],
  rushed: ["rushed", "hurry", "hurried", "running late", "no time"],
};

const SUGGESTIONS: Record<string, string> = {
  tired: "Try scheduling this earlier or after a rest day",
  busy: "Consider reducing to a minimum version on busy days",
  sick: "Build in recovery days to your schedule",
  travel: "Create a travel-friendly version of this habit",
  late: "Try moving this to evening instead",
  stressed: "Pair this with a calming routine first",
  rushed: "Try moving this to a less rushed time of day",
};

export function useRootCauses(): { causes: RootCause[]; loading: boolean } {
  const gun = useGun();
  const { habits: rawHabits, logs: allLogs, habitsLoading, logsLoaded } = useSharedData();
  const [journalEntries, setJournalEntries] = useState<Record<string, string>>({});
  const [journalLoaded, setJournalLoaded] = useState(false);

  useEffect(() => {
    if (!gun) return;

    const entries: Record<string, string> = {};
    let timer: ReturnType<typeof setTimeout> | null = null;

    gun.get("journal").map().on((data: Record<string, unknown> | null, dateKey: string) => {
      if (!data || !dateKey) return;
      const cleaned = stripGunMeta(data);
      if (cleaned.text && typeof cleaned.text === "string") {
        entries[dateKey] = cleaned.text;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setJournalEntries({ ...entries });
        setJournalLoaded(true);
      }, 200);
    });

    const fallback = setTimeout(() => setJournalLoaded(true), 3000);

    return () => {
      clearTimeout(fallback);
      if (timer) clearTimeout(timer);
    };
  }, [gun]);

  const causes = useMemo(() => {
    if (habitsLoading || !logsLoaded || !journalLoaded) return [];

    const habits = Object.values(rawHabits).filter((h) => !h.archived);
    if (habits.length === 0) return [];

    const today = todayKey();
    const results: RootCause[] = [];

    for (const habit of habits) {
      let scheduled = 0;
      let completed = 0;
      const missedDays: string[] = [];
      const skipReasons: string[] = [];
      let frictionSum = 0;
      let frictionCount = 0;

      for (let i = 1; i <= 14; i++) {
        const dk = addDays(today, -i);
        if (habit.createdAt && fromDateKey(dk).getTime() < habit.createdAt) continue;
        if (!isScheduledOn(habit.frequency, dk)) continue;

        scheduled++;
        const log = allLogs[dk]?.[habit.id];

        if (log?.done) {
          completed++;
          if (log.friction !== null && log.friction !== undefined) {
            frictionSum += log.friction;
            frictionCount++;
          }
        } else {
          missedDays.push(dk);
          if (log?.skipped && log?.skipReason) {
            skipReasons.push(log.skipReason.toLowerCase());
          }
        }
      }

      if (scheduled === 0) continue;
      const completionRate = completed / scheduled;

      if (completionRate >= 0.5) continue;

      const keywordHits: Record<string, number> = {};
      for (const dk of missedDays) {
        const text = journalEntries[dk]?.toLowerCase() || "";
        if (!text) continue;

        for (const [category, words] of Object.entries(KEYWORDS)) {
          for (const word of words) {
            if (text.includes(word)) {
              keywordHits[category] = (keywordHits[category] || 0) + 1;
              break;
            }
          }
        }
      }

      for (const [category, count] of Object.entries(keywordHits)) {
        if (count >= 2) {
          results.push({
            habitId: habit.id,
            habitName: habit.name,
            pattern: `You miss ${habit.name} when you're ${category}`,
            confidence: count >= 3 ? "high" : "medium",
            suggestion: SUGGESTIONS[category],
          });
        }
      }

      const skipReasonCounts: Record<string, number> = {};
      for (const reason of skipReasons) {
        const normalized = reason.trim().toLowerCase();
        if (normalized) {
          skipReasonCounts[normalized] = (skipReasonCounts[normalized] || 0) + 1;
        }
      }

      for (const [reason, count] of Object.entries(skipReasonCounts)) {
        if (count >= 2) {
          results.push({
            habitId: habit.id,
            habitName: habit.name,
            pattern: `You skip ${habit.name} because "${reason}"`,
            confidence: count >= 3 ? "high" : "medium",
            suggestion: `Consider adapting ${habit.name} for days when you're ${reason}`,
          });
        }
      }

      if (frictionCount >= 2) {
        const avgFriction = frictionSum / frictionCount;
        if (avgFriction >= 2.5) {
          const alreadyCovered = results.some(
            (r) => r.habitId === habit.id
          );
          if (!alreadyCovered) {
            results.push({
              habitId: habit.id,
              habitName: habit.name,
              pattern: `Friction has been high for ${habit.name} recently`,
              confidence: frictionCount >= 3 ? "high" : "medium",
              suggestion: "Consider reducing the scope or making it easier to start",
            });
          }
        }
      }
    }

    return results;
  }, [rawHabits, allLogs, habitsLoading, logsLoaded, journalEntries, journalLoaded]);

  return {
    causes,
    loading: habitsLoading || !logsLoaded || !journalLoaded,
  };
}
