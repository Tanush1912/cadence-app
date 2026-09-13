"use client";

import { cn } from "@/lib/utils";
import { getWeekDays, getDayNumber, isToday, isFuture } from "@/lib/utils/dates";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function DaySelector({
  selectedDate,
  onSelect,
  weekProgress,
}: {
  selectedDate: string;
  onSelect: (dateKey: string) => void;
  weekProgress: Record<string, number>;
}) {
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="px-5 py-2">
      <div className="flex items-center gap-1">
        {weekDays.map((dateKey, i) => {
          const selected = dateKey === selectedDate;
          const today = isToday(dateKey);
          const future = isFuture(dateKey);
          const dayNum = getDayNumber(dateKey);
          const pct = weekProgress[dateKey];
          const hasData = pct !== undefined;

          return (
            <button
              key={dateKey}
              onClick={() => onSelect(dateKey)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-sm py-2 transition-all",
                selected ? "bg-secondary" : "hover:bg-secondary/50",
                future && "opacity-40"
              )}
            >
              <span className="text-micro font-medium text-muted-foreground uppercase">
                {DAY_LETTERS[i]}
              </span>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-label font-medium",
                  today && selected && "text-primary-foreground",
                  today && !selected && "font-bold text-foreground",
                  !today && selected && "text-foreground",
                  !today && !selected && "text-muted-foreground"
                )}
                style={today && selected ? { backgroundColor: "var(--primary)" } : undefined}
              >
                {dayNum}
              </span>
              {!future && (
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    hasData
                      ? pct >= 70
                        ? "bg-primary"
                        : pct >= 40
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      : "bg-surface-3"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
