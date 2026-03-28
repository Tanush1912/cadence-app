"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { useSharedData } from "@/lib/gun/data-provider";
import { stripGunMeta } from "@/lib/gun/gun-utils";
import { extractTags, getAllTags } from "@/lib/utils/tags";
import { formatDateShort } from "@/lib/utils/dates";
import type { Habit, JournalEntry } from "@/lib/types";

export interface HabitResult {
  habit: Habit;
  completionRate: number;
}

export interface JournalResult {
  dateKey: string;
  dateLabel: string;
  text: string;
  tags: string[];
}

export interface TagResult {
  tag: string;
  count: number;
}

interface SearchResults {
  habitResults: HabitResult[];
  journalResults: JournalResult[];
  tagResults: TagResult[];
  loading: boolean;
}

/**
 * Loads all journal entries from GunDB and provides search across
 * habits, journal entries, and tags. Debounced by 200ms.
 */
export function useSearch(query: string): SearchResults {
  const gun = useGun();
  const { habits, logs, logsLoaded } = useSharedData();

  const [journalEntries, setJournalEntries] = useState<
    Record<string, JournalEntry>
  >({});
  const [journalLoaded, setJournalLoaded] = useState(false);
  const journalAccum = useRef<Record<string, JournalEntry>>({});

  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!gun) return;

    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    gun
      .get("journal")
      .map()
      .on((raw: Record<string, unknown> | null, dateKey: string) => {
        if (!raw || typeof raw !== "object") return;

        const cleaned = stripGunMeta(raw);
        if (cleaned.text !== undefined) {
          journalAccum.current[dateKey] = {
            text: (cleaned.text as string) ?? "",
            mood: (cleaned.mood as JournalEntry["mood"]) ?? null,
            createdAt: (cleaned.createdAt as number) ?? Date.now(),
            updatedAt: (cleaned.updatedAt as number) ?? Date.now(),
          };
        }

        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(() => {
          setJournalEntries({ ...journalAccum.current });
          setJournalLoaded(true);
        }, 150);
      });

    const timeout = setTimeout(() => setJournalLoaded(true), 1500);

    return () => {
      gun.get("journal").off();
      clearTimeout(timeout);
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [gun]);

  const allTags = useMemo(
    () => getAllTags(journalEntries),
    [journalEntries]
  );

  const completionRates = useMemo(() => {
    if (!logsLoaded) return {};
    const rates: Record<string, number> = {};
    const habitIds = Object.keys(habits);

    for (const habitId of habitIds) {
      let total = 0;
      let done = 0;
      for (const dateKey of Object.keys(logs)) {
        const entry = logs[dateKey]?.[habitId];
        if (entry !== undefined) {
          total++;
          if (entry.done) done++;
        }
      }
      rates[habitId] = total > 0 ? Math.round((done / total) * 100) : 0;
    }
    return rates;
  }, [habits, logs, logsLoaded]);

  const results = useMemo((): Omit<SearchResults, "loading"> => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      return { habitResults: [], journalResults: [], tagResults: [] };
    }

    const habitResults: HabitResult[] = Object.values(habits)
      .filter(
        (h) =>
          !h.archived &&
          (h.name.toLowerCase().includes(q) ||
            h.emoji.toLowerCase().includes(q))
      )
      .slice(0, 20)
      .map((habit) => ({
        habit,
        completionRate: completionRates[habit.id] ?? 0,
      }));

    const journalResults: JournalResult[] = Object.entries(journalEntries)
      .filter(([, entry]) => entry.text.toLowerCase().includes(q))
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 20)
      .map(([dateKey, entry]) => ({
        dateKey,
        dateLabel: formatDateShort(dateKey),
        text: entry.text,
        tags: extractTags(entry.text),
      }));

    const tagResults: TagResult[] = allTags
      .filter((t) => t.tag.includes(q))
      .slice(0, 20);

    return { habitResults, journalResults, tagResults };
  }, [debouncedQuery, habits, journalEntries, allTags, completionRates]);

  const loading = !journalLoaded || !logsLoaded;

  return { ...results, loading };
}
