"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSharedData } from "@/lib/gun/data-provider";
import { useGun } from "@/lib/gun/gun-provider";
import {
  toDateKey,
  fromDateKey,
  todayKey,
  isEditable,
  addDays,
} from "@/lib/utils/dates";
import { isScheduledOn } from "@/lib/utils/frequency";
import { MiniHeatmap } from "./mini-heatmap";
import { HabitIcon } from "@/lib/utils/habit-icons";
import type { Habit, Log, FrictionScore } from "@/lib/types";

const COLOR_MAP: Record<string, string> = {
  teal: "#2dd4bf",
  amber: "#f59e0b",
  rose: "#fb7185",
  green: "#4ade80",
  purple: "#a78bfa",
  blue: "#60a5fa",
  white: "#e4e4e7",
  orange: "#fb923c",
};

const GROUP_FALLBACK_COLOR: Record<string, string> = {
  morning: "teal",
  evening: "amber",
  anytime: "rose",
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function CalendarDrawer({
  open,
  onOpenChange,
  habit,
  heatmapData,
  onSelectDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit;
  heatmapData: boolean[];
  onSelectDate: (dateKey: string) => void;
}) {
  const gun = useGun();
  const { logs, updateLog: updateSharedLog } = useSharedData();

  const today = todayKey();
  const todayDate = fromDateKey(today);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());

  const habitColor = habit.color || GROUP_FALLBACK_COLOR[habit.group] || "teal";
  const hexColor = COLOR_MAP[habitColor] || COLOR_MAP.teal;

  const cells = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const completionMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (let d = 1; d <= 31; d++) {
      const dk = toDateKey(new Date(viewYear, viewMonth, d));
      if (new Date(viewYear, viewMonth, d).getMonth() !== viewMonth) break;
      map[d] = !!logs[dk]?.[habit.id]?.done;
    }
    return map;
  }, [logs, habit.id, viewYear, viewMonth]);

  const scheduledMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (let d = 1; d <= 31; d++) {
      const date = new Date(viewYear, viewMonth, d);
      if (date.getMonth() !== viewMonth) break;
      const dk = toDateKey(date);
      map[d] = isScheduledOn(habit.frequency, dk);
    }
    return map;
  }, [habit.frequency, viewYear, viewMonth]);

  const toggleDay = useCallback(
    (day: number) => {
      if (!gun) return;
      const dk = toDateKey(new Date(viewYear, viewMonth, day));
      if (!isEditable(dk)) return;

      const current = logs[dk]?.[habit.id];
      const isDone = current?.done ?? false;
      const isRetroactive = dk !== todayKey();

      const newLog: Log = isDone
        ? { done: false, friction: null, retroactive: isRetroactive, completedAt: null }
        : { done: true, friction: null, retroactive: isRetroactive, completedAt: Date.now() };

      updateSharedLog(dk, habit.id, newLog);
      gun.get("logs").get(dk).get(habit.id).put({
        done: newLog.done,
        friction: newLog.friction,
        retroactive: newLog.retroactive,
        completedAt: newLog.completedAt,
      });
    },
    [gun, viewYear, viewMonth, logs, habit.id, updateSharedLog]
  );

  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const monthStats = useMemo(() => {
    let scheduled = 0;
    let completed = 0;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = toDateKey(new Date(viewYear, viewMonth, d));
      if (dk > today) break;
      if (scheduledMap[d]) {
        scheduled++;
        if (completionMap[d]) completed++;
      }
    }
    return { scheduled, completed, rate: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0 };
  }, [viewYear, viewMonth, today, scheduledMap, completionMap]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[#141414] border-t border-[#262626]"
          >
            <div className="mx-auto mt-3 h-1 w-[60px] rounded-full bg-[#333]" />

            <div className="px-5 pt-4 pb-2 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${hexColor}15`, color: hexColor }}
              >
                <HabitIcon name={habit.name} size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[17px] font-semibold truncate">{habit.name}</h2>
                {habit.floor && (
                  <p className="text-xs text-muted-foreground truncate">{habit.floor}</p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg bg-[#262626] flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-3">
              <MiniHeatmap data={heatmapData} accentColor={habitColor} />
            </div>

            <div className="px-5 pb-2 flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium" style={{ color: hexColor }}>{monthStats.rate}%</span>
                <span>{monthStats.completed}/{monthStats.scheduled} this month</span>
              </div>
            </div>

            <div className="px-5 pt-2 pb-4">
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-[11px] text-muted-foreground/50 font-medium py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  if (day === null) {
                    return <div key={`empty-${i}`} className="aspect-square" />;
                  }

                  const dk = toDateKey(new Date(viewYear, viewMonth, day));
                  const done = completionMap[day];
                  const scheduled = scheduledMap[day];
                  const editable = isEditable(dk);
                  const isFuture = dk > today;
                  const isCurrentDay = dk === today;

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (editable && scheduled) toggleDay(day);
                      }}
                      className="aspect-square flex items-center justify-center relative"
                      disabled={isFuture}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-[14px] font-medium transition-colors ${
                          done
                            ? "text-[#0a0a0a]"
                            : isFuture
                              ? "text-muted-foreground/20"
                              : !scheduled
                                ? "text-muted-foreground/30"
                                : editable
                                  ? "text-foreground/80 hover:bg-[#1a1a1a]"
                                  : "text-muted-foreground/50"
                        }`}
                        style={done ? { backgroundColor: hexColor } : undefined}
                      >
                        {day}
                      </div>
                      {isCurrentDay && !done && (
                        <div
                          className="absolute bottom-0.5 w-1 h-1 rounded-full"
                          style={{ backgroundColor: hexColor }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 pb-8 flex items-center justify-between">
              <button
                onClick={() => {
                  const todayD = new Date();
                  setViewYear(todayD.getFullYear());
                  setViewMonth(todayD.getMonth());
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
                </svg>
                {monthLabel}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevMonth}
                  className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={goToNextMonth}
                  className="w-9 h-9 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
