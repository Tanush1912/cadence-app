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
                "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all",
                selected ? "bg-[#1a1a1a]" : "hover:bg-[#1a1a1a]/50",
                future && "opacity-40"
              )}
            >
              <span className="text-[10px] uppercase text-muted-foreground font-medium">
                {DAY_LETTERS[i]}
              </span>
              <span
                className={cn(
                  "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full",
                  today && selected && "text-[#0a0a0a]",
                  today && !selected && "text-foreground font-bold",
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
                    "w-1.5 h-1.5 rounded-full",
                    hasData
                      ? pct >= 70
                        ? "bg-[var(--primary)]"
                        : pct >= 40
                          ? "bg-amber-400"
                          : "bg-rose-400"
                      : "bg-[#262626]"
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
