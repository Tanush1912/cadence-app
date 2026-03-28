"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { stripGunMeta } from "@/lib/gun/gun-utils";

export interface ReflectionSummary {
  summary: string;
  date: number;
}

interface UseReflectionsReturn {
  currentWeek: ReflectionSummary | null;
  pastWeeks: ReflectionSummary[];
  pastWeekKeys: string[];
  saveSummary: (weekKey: string, summary: string) => void;
  loading: boolean;
}

/**
 * Returns ISO week key like "2026-W13" for a given date.
 */
export function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Returns an array of ISO week keys for the last N weeks ending at the given date.
 */
function getRecentWeekKeys(count: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = getISOWeekKey(d);
    if (!keys.includes(key)) {
      keys.push(key);
    }
  }
  while (keys.length < count) {
    const d = new Date(now);
    d.setDate(d.getDate() - (keys.length + (count - keys.length)) * 7);
    const key = getISOWeekKey(d);
    if (!keys.includes(key)) {
      keys.push(key);
    } else {
      break;
    }
  }
  return keys;
}

export function useReflections(): UseReflectionsReturn {
  const gun = useGun();
  const [reflections, setReflections] = useState<Record<string, ReflectionSummary>>({});
  const [loading, setLoading] = useState(true);
  const accumulator = useRef<Record<string, ReflectionSummary>>({});
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekKeys = useRef(getRecentWeekKeys(5));
  const currentWeekKey = weekKeys.current[0];

  useEffect(() => {
    if (!gun) {
      setLoading(false);
      return;
    }

    setLoading(true);
    accumulator.current = {};

    const node = gun.get("reflections");

    node.map().on((raw: Record<string, unknown> | null, key: string) => {
      if (!raw || !weekKeys.current.includes(key)) return;

      const cleaned = stripGunMeta(raw);
      if (cleaned.summary && typeof cleaned.summary === "string") {
        accumulator.current[key] = {
          summary: cleaned.summary as string,
          date: (cleaned.date as number) ?? 0,
        };
      }

      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => {
        setReflections({ ...accumulator.current });
        setLoading(false);
      }, 50);
    });

    const timeout = setTimeout(() => setLoading(false), 500);

    return () => {
      node.off();
      clearTimeout(timeout);
      if (updateTimer.current) clearTimeout(updateTimer.current);
      accumulator.current = {};
    };
  }, [gun]);

  const saveSummary = useCallback(
    (weekKey: string, summary: string) => {
      if (!gun) return;
      const data = { summary, date: Date.now() };
      gun.get("reflections").get(weekKey).put(data);
      setReflections((prev) => ({ ...prev, [weekKey]: data }));
    },
    [gun]
  );

  const currentWeek = reflections[currentWeekKey] ?? null;

  const pastWeekKeysList = weekKeys.current.slice(1);
  const pastWeeks = pastWeekKeysList
    .filter((k) => reflections[k])
    .map((k) => reflections[k]);

  return {
    currentWeek,
    pastWeeks,
    pastWeekKeys: pastWeekKeysList.filter((k) => reflections[k]),
    saveSummary,
    loading,
  };
}
