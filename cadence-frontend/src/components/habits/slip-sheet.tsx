"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSharedData } from "@/lib/gun/data-provider";
import { addDays, fromDateKey, todayKey } from "@/lib/utils/dates";
import { haptic } from "@/lib/utils/haptics";
import { cn } from "@/lib/utils";
import { composeSlipReason, slipTrigger, type Habit } from "@/lib/types";

/** Not the skip reasons. Those are why you did not do a thing; these are why you did. */
export const SLIP_TRIGGERS = ["Stress", "Bored", "Social", "Craving", "Autopilot"];

const RECENT_WINDOW = 90;
const RECENT_LIMIT = 4;

function formatSlipDate(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function SlipSheet({
  open,
  habit,
  dateKey,
  cleanDays,
  onOpenChange,
  onLogSlip,
}: {
  open: boolean;
  habit: Habit | null;
  dateKey: string;
  cleanDays: number;
  onOpenChange: (open: boolean) => void;
  onLogSlip: (habitId: string, reason: string) => void;
}) {
  const { logs } = useSharedData();
  const [trigger, setTrigger] = useState<string | null>(null);
  const [note, setNote] = useState("");

  // Reset on every close path (Cancel, overlay, swipe, logged) so the sheet never reopens dirty.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setTrigger(null);
        setNote("");
      }
      onOpenChange(next);
    },
    [onOpenChange]
  );

  const recentSlips = useMemo(() => {
    if (!habit) return [];
    const today = todayKey();
    const out: { dateKey: string; trigger: string }[] = [];

    for (let i = 0; i < RECENT_WINDOW && out.length < RECENT_LIMIT; i++) {
      const dk = addDays(today, -i);
      if (habit.createdAt && fromDateKey(dk).getTime() < habit.createdAt) break;
      const log = logs[dk]?.[habit.id];
      if (log?.slipped) out.push({ dateKey: dk, trigger: slipTrigger(log.slipReason) });
    }

    return out;
  }, [habit, logs]);

  const handleLog = useCallback(() => {
    if (!habit) return;
    onLogSlip(habit.id, composeSlipReason(trigger, note));
    haptic("medium");
    handleOpenChange(false);
  }, [habit, trigger, note, onLogSlip, handleOpenChange]);

  if (!habit) return null;

  const isToday = dateKey === todayKey();
  // cleanDays is today's run, so it only resets to zero when the slip is today's.
  const lead =
    isToday && cleanDays > 0
      ? `You are ${cleanDays} ${cleanDays === 1 ? "day" : "days"} clean. Logging a slip for today resets that to zero and keeps the record honest.`
      : isToday
        ? "Logging a slip for today keeps the record honest. Nothing else on this habit changes."
        : `Logging a slip for ${formatSlipDate(dateKey)} shortens your current run and keeps the record honest.`;

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{habit.name}</DrawerTitle>
        </DrawerHeader>

        <DrawerBody className="px-5">
          <p className="text-label text-muted-foreground">{lead}</p>

          <p className="pt-5 pb-2 text-micro text-ink-3">What triggered it</p>
          <div className="flex flex-wrap gap-2">
            {SLIP_TRIGGERS.map((t) => (
              <button
                key={t}
                onClick={() => setTrigger((prev) => (prev === t ? null : t))}
                aria-pressed={trigger === t}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-label font-medium transition-colors",
                  trigger === t
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <label
            htmlFor="slip-note"
            className="block pt-5 pb-2 text-micro text-ink-3"
          >
            Note, optional
          </label>
          <input
            id="slip-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened?"
            className="h-11 w-full rounded-sm border border-border bg-secondary px-3 text-body text-foreground placeholder:text-ink-3 focus:border-surface-3 focus:outline-none"
          />

          {recentSlips.length > 0 && (
            <>
              <p className="pt-6 pb-1 text-micro text-ink-3">Recent slips</p>
              {recentSlips.map((s) => (
                <div
                  key={s.dateKey}
                  className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span className="truncate text-label text-muted-foreground">
                    {formatSlipDate(s.dateKey)}
                  </span>
                  {s.trigger && (
                    <span className="shrink-0 font-mono text-micro text-ink-3">{s.trigger}</span>
                  )}
                </div>
              ))}
            </>
          )}

          <p className="pt-6 pb-2 text-micro text-ink-3">
            Triggers feed the same root cause engine as your journal, so patterns show up on Stats.
          </p>
        </DrawerBody>

        <DrawerFooter style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
          <button
            onClick={handleLog}
            className="h-12 w-full rounded-sm bg-destructive text-body font-semibold text-foreground transition-opacity active:opacity-80"
          >
            Log slip
          </button>
          <button
            onClick={() => handleOpenChange(false)}
            className="h-11 w-full rounded-sm text-body text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
