"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { useSharedData } from "@/lib/gun/data-provider";
import { stripGunMeta } from "@/lib/gun/gun-utils";
import { todayKey } from "@/lib/utils/dates";
import type { Log, FrictionScore } from "@/lib/types";

export function useLogs(dateKey: string) {
  const gun = useGun();
  const { updateLog: updateSharedLog } = useSharedData();
  const [logs, setLogs] = useState<Record<string, Log>>({});
  const [loading, setLoading] = useState(true);
  const accumulator = useRef<Record<string, Log>>({});
  const updateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!gun || !dateKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    accumulator.current = {};

    const node = gun.get("logs").get(dateKey);

    node.map().on((raw: Record<string, unknown> | null, habitId: string) => {
      if (!raw) {
        delete accumulator.current[habitId];
      } else {
        const cleaned = stripGunMeta(raw);
        accumulator.current[habitId] = {
          done: !!cleaned.done,
          friction: (cleaned.friction as FrictionScore) ?? null,
          retroactive: !!cleaned.retroactive,
          completedAt: (cleaned.completedAt as number) ?? null,
          skipped: !!cleaned.skipped,
          skipReason: (cleaned.skipReason as string) ?? "",
          slipped: !!cleaned.slipped,
          slipReason: (cleaned.slipReason as string) ?? "",
        };
      }

      if (updateTimer.current) clearTimeout(updateTimer.current);
      updateTimer.current = setTimeout(() => {
        setLogs({ ...accumulator.current });
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
  }, [gun, dateKey]);

  const toggleLog = useCallback(
    (habitId: string) => {
      if (!gun) return;

      const current = logs[habitId];
      const isDone = current?.done ?? false;
      const isRetroactive = dateKey !== todayKey();

      const newLog: Log = isDone
        ? { done: false, friction: null, retroactive: isRetroactive, completedAt: null }
        : { done: true, friction: null, retroactive: isRetroactive, completedAt: Date.now() };

      setLogs((prev) => ({ ...prev, [habitId]: newLog }));
      accumulator.current[habitId] = newLog;
      updateSharedLog(dateKey, habitId, newLog);

      gun.get("logs").get(dateKey).get(habitId).put({
        done: newLog.done,
        friction: newLog.friction,
        retroactive: newLog.retroactive,
        completedAt: newLog.completedAt,
      });

      return !isDone;
    },
    [gun, logs, dateKey, updateSharedLog]
  );

  const logSlip = useCallback(
    (habitId: string, reason: string) => {
      if (!gun) return;

      const newLog: Log = {
        done: false,
        friction: null,
        retroactive: dateKey !== todayKey(),
        completedAt: Date.now(),
        slipped: true,
        slipReason: reason,
      };

      setLogs((prev) => ({ ...prev, [habitId]: newLog }));
      accumulator.current[habitId] = newLog;
      updateSharedLog(dateKey, habitId, newLog);

      gun.get("logs").get(dateKey).get(habitId).put({
        slipped: true,
        slipReason: reason,
        completedAt: newLog.completedAt,
      });
    },
    [gun, dateKey, updateSharedLog]
  );

  const setFriction = useCallback(
    (habitId: string, score: FrictionScore) => {
      if (!gun) return;

      setLogs((prev) => ({
        ...prev,
        [habitId]: { ...prev[habitId], friction: score },
      }));
      if (accumulator.current[habitId]) {
        accumulator.current[habitId] = { ...accumulator.current[habitId], friction: score };
      }

      gun.get("logs").get(dateKey).get(habitId).put({ friction: score });
    },
    [gun, dateKey]
  );

  return { logs, loading, toggleLog, logSlip, setFriction };
}
