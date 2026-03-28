"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { stripGunMeta, generateId } from "@/lib/gun/gun-utils";
import { useSharedData } from "@/lib/gun/data-provider";
import { todayKey, addDays } from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";

export interface Experiment {
  id: string;
  habitId: string;
  change: string;
  originalValue: string;
  field: "group" | "frequency";
  startDate: string;
  endDate: string;
  baselineRate: number;
  active: boolean;
  result?: number;
}

export function useExperiments() {
  const gun = useGun();
  const { habits, logs } = useSharedData();
  const [experiments, setExperiments] = useState<Record<string, Experiment>>({});
  const [loading, setLoading] = useState(true);
  const accumulator = useRef<Record<string, Experiment>>({});
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!gun) {
      setLoading(false);
      return;
    }

    setLoading(true);
    accumulator.current = {};

    const node = gun.get("experiments");

    node.map().on((raw: Record<string, unknown> | null, expId: string) => {
      if (!raw) {
        delete accumulator.current[expId];
      } else {
        const cleaned = stripGunMeta(raw);
        if (!cleaned.habitId) {
          delete accumulator.current[expId];
        } else {
          accumulator.current[expId] = {
            id: expId,
            habitId: cleaned.habitId as string,
            change: cleaned.change as string,
            originalValue: cleaned.originalValue as string,
            field: cleaned.field as "group" | "frequency",
            startDate: cleaned.startDate as string,
            endDate: cleaned.endDate as string,
            baselineRate: cleaned.baselineRate as number,
            active: !!cleaned.active,
            result: cleaned.result as number | undefined,
          };
        }
      }

      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => {
        setExperiments({ ...accumulator.current });
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

  const computeRate = useCallback(
    (habitId: string, frequency: string, fromDate: string, toDate: string): number => {
      let scheduled = 0;
      let completed = 0;
      let current = fromDate;

      while (current <= toDate) {
        if (isScheduledOn(frequency, current)) {
          scheduled++;
          if (logs[current]?.[habitId]?.done) {
            completed++;
          }
        }
        current = addDays(current, 1);
      }

      return scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
    },
    [logs]
  );

  const activeExperiment = Object.values(experiments).find((e) => e.active) ?? null;

  const isExpired = activeExperiment ? todayKey() > activeExperiment.endDate : false;

  const createExperiment = useCallback(
    (habitId: string, field: "group" | "frequency", newValue: string, change: string) => {
      if (!gun) return;
      if (activeExperiment) return;

      const habit = habits[habitId];
      if (!habit) return;

      const originalValue = field === "group" ? habit.group : habit.frequency;
      const today = todayKey();
      const startDate = today;
      const endDate = addDays(today, 14);

      const baselineStart = addDays(today, -14);
      const baselineEnd = addDays(today, -1);
      const baselineRate = computeRate(habitId, habit.frequency, baselineStart, baselineEnd);

      const id = generateId();
      const experiment = {
        habitId,
        change,
        originalValue,
        field,
        startDate,
        endDate,
        baselineRate,
        active: true,
      };

      gun.get("experiments").get(id).put(experiment);

      gun.get("habits").get(habitId).put({ [field]: newValue });

      accumulator.current[id] = { ...experiment, id };
      setExperiments({ ...accumulator.current });
    },
    [gun, activeExperiment, habits, computeRate]
  );

  const endExperiment = useCallback(
    (experimentId: string, keep: boolean) => {
      if (!gun) return;

      const experiment = experiments[experimentId];
      if (!experiment) return;

      const habit = habits[experiment.habitId];
      const frequency = habit?.frequency ?? "daily";

      const today = todayKey();
      const effectiveEnd = today < experiment.endDate ? today : experiment.endDate;
      const result = computeRate(experiment.habitId, frequency, experiment.startDate, effectiveEnd);

      if (!keep && habit) {
        gun.get("habits").get(experiment.habitId).put({
          [experiment.field]: experiment.originalValue,
        });
      }

      gun.get("experiments").get(experimentId).put({
        active: false,
        result,
      });

      accumulator.current[experimentId] = {
        ...experiment,
        active: false,
        result,
      };
      setExperiments({ ...accumulator.current });
    },
    [gun, experiments, habits, computeRate]
  );

  return {
    experiments,
    activeExperiment,
    isExpired,
    createExperiment,
    endExperiment,
    loading,
  };
}
