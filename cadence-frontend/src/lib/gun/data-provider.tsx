"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { stripGunMeta } from "@/lib/gun/gun-utils";
import type { Habit, Log, FrictionScore } from "@/lib/types";

interface LogEntry {
  done: boolean;
  friction: FrictionScore;
  retroactive: boolean;
  completedAt: number | null;
  skipped?: boolean;
  skipReason?: string;
  slipped?: boolean;
  slipReason?: string;
}

interface DataState {
  habits: Record<string, Habit>;
  /** logs[dateKey][habitId] = LogEntry */
  logs: Record<string, Record<string, LogEntry>>;
  habitsLoading: boolean;
  logsLoaded: boolean;
}

interface DataContextValue extends DataState {
  refreshLogs: () => void;
  updateLog: (dateKey: string, habitId: string, log: LogEntry | null) => void;
}

const DataContext = createContext<DataContextValue>({
  habits: {},
  logs: {},
  habitsLoading: true,
  logsLoaded: false,
  refreshLogs: () => {},
  updateLog: () => {},
});

export function useSharedData() {
  return useContext(DataContext);
}

/**
 * Centralized data provider — loads all habits and logs ONCE,
 * keeps them in memory, and provides to all consumers.
 * Eliminates N+1 queries across tabs.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const gun = useGun();
  const [state, setState] = useState<DataState>({
    habits: {},
    logs: {},
    habitsLoading: true,
    logsLoaded: false,
  });
  const habitsAccum = useRef<Record<string, Habit>>({});
  const logsAccum = useRef<Record<string, Record<string, LogEntry>>>({});
  const habitsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logsSubscribed = useRef(false);

  useEffect(() => {
    if (!gun) return;

    const node = gun.get("habits");
    node.map().on((raw: Record<string, unknown> | null, key: string) => {
      if (!raw) {
        delete habitsAccum.current[key];
      } else {
        const cleaned = stripGunMeta(raw);
        habitsAccum.current[key] = { ...cleaned, id: key } as unknown as Habit;
      }

      if (habitsTimer.current) clearTimeout(habitsTimer.current);
      habitsTimer.current = setTimeout(() => {
        setState((prev) => ({
          ...prev,
          habits: { ...habitsAccum.current },
          habitsLoading: false,
        }));
      }, 80);
    });

    const timeout = setTimeout(() => {
      setState((prev) => ({ ...prev, habitsLoading: false }));
    }, 1000);

    return () => {
      node.off();
      clearTimeout(timeout);
      if (habitsTimer.current) clearTimeout(habitsTimer.current);
    };
  }, [gun]);

  const loadLogs = useCallback(() => {
    if (!gun || logsSubscribed.current) return;
    logsSubscribed.current = true;

    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const subscribedDates = new Set<string>();

    const flush = () => {
      setState((prev) => ({
        ...prev,
        logs: JSON.parse(JSON.stringify(logsAccum.current)),
        logsLoaded: true,
      }));
    };

    gun.get("logs").map().on((_dateData: unknown, dateKey: string) => {
      if (!dateKey || subscribedDates.has(dateKey)) return;
      subscribedDates.add(dateKey);

      if (!logsAccum.current[dateKey]) logsAccum.current[dateKey] = {};

      gun.get("logs").get(dateKey).map().on((habitData: Record<string, unknown> | null, habitId: string) => {
        if (!habitData || typeof habitData !== "object" || !habitId) return;

        const cleaned = stripGunMeta(habitData);
        if (cleaned.done === undefined && cleaned.slipped === undefined) return;

        logsAccum.current[dateKey][habitId] = {
          done: !!cleaned.done,
          friction: (cleaned.friction as FrictionScore) ?? null,
          retroactive: !!cleaned.retroactive,
          completedAt: (cleaned.completedAt as number) ?? null,
          skipped: !!cleaned.skipped,
          skipReason: (cleaned.skipReason as string) ?? "",
          slipped: !!cleaned.slipped,
          slipReason: (cleaned.slipReason as string) ?? "",
        };

        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = setTimeout(flush, 100);
      });
    });

    setTimeout(() => {
      setState((prev) => {
        if (!prev.logsLoaded) return { ...prev, logsLoaded: true };
        return prev;
      });
    }, 3000);
  }, [gun]);

  useEffect(() => {
    if (gun) loadLogs();
  }, [gun, loadLogs]);

  const refreshLogs = useCallback(() => {
    logsSubscribed.current = false;
    loadLogs();
  }, [loadLogs]);

  const updateLog = useCallback((dateKey: string, habitId: string, log: LogEntry | null) => {
    setState((prev) => {
      const dateLogs = { ...prev.logs[dateKey] };
      if (log) {
        dateLogs[habitId] = log;
      } else {
        delete dateLogs[habitId];
      }
      return {
        ...prev,
        logs: { ...prev.logs, [dateKey]: dateLogs },
      };
    });
  }, []);

  return (
    <DataContext.Provider value={{ ...state, refreshLogs, updateLog }}>
      {children}
    </DataContext.Provider>
  );
}
