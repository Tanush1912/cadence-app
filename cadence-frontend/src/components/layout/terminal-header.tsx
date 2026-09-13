"use client";

import { cn } from "@/lib/utils";
import { fromDateKey } from "@/lib/utils/dates";
import { ProgressRing } from "@/components/habits/progress-ring";

/** 44px hit area over a 36px control, without growing the visual. */
const HIT_AREA = "relative after:absolute after:inset-[-4px] after:content-['']";

export function AppHeader({
  selectedDate,
  onAdd,
  onSearch,
  minimumMode,
  onToggleMinimumMode,
  completed = 0,
  total = 0,
}: {
  selectedDate: string;
  onAdd?: () => void;
  onSearch?: () => void;
  minimumMode?: boolean;
  onToggleMinimumMode?: () => void;
  completed?: number;
  total?: number;
}) {
  const dateDisplay = fromDateKey(selectedDate).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="px-5 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-page-title font-semibold tracking-tight">Cadence</h1>
          <p className="mt-0.5 truncate text-label text-muted-foreground">{dateDisplay}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleMinimumMode && (
            <button
              onClick={onToggleMinimumMode}
              aria-pressed={!!minimumMode}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-micro font-bold tracking-wide transition-all",
                HIT_AREA,
                minimumMode
                  ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {minimumMode ? "ON" : "min"}
            </button>
          )}
          {onSearch && (
            <button
              onClick={onSearch}
              aria-label="Search"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground",
                HIT_AREA
              )}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          )}
          {onAdd && (
            <button
              onClick={onAdd}
              aria-label="Add habit"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:text-foreground",
                HIT_AREA
              )}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
          <ProgressRing completed={completed} total={total} minimumMode={minimumMode} />
        </div>
      </div>
    </header>
  );
}
