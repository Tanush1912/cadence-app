"use client";

import { cn } from "@/lib/utils";
import { formatDateLong } from "@/lib/utils/dates";

export function AppHeader({
  selectedDate,
  onAdd,
  onSearch,
  minimumMode,
  onToggleMinimumMode,
}: {
  selectedDate: string;
  onAdd?: () => void;
  onSearch?: () => void;
  minimumMode?: boolean;
  onToggleMinimumMode?: () => void;
}) {
  const dateDisplay = formatDateLong(selectedDate);
  const hour = new Date().getHours();
  const greeting = hour < 12
    ? "Good morning"
    : hour >= 22
      ? "Wind down"
      : hour >= 18
        ? "Evening"
        : null;

  return (
    <header className="px-5 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Cadence
          </h1>
          {greeting ? (
            <div className="mt-0.5">
              <p className="text-sm text-muted-foreground">{greeting}</p>
              <p className="text-[10px] text-muted-foreground/50">{dateDisplay}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-0.5">{dateDisplay}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onToggleMinimumMode && (
            <button
              onClick={onToggleMinimumMode}
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wide transition-all",
                minimumMode
                  ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30"
                  : "bg-[#1a1a1a] text-muted-foreground hover:text-foreground"
              )}
            >
              {minimumMode ? "ON" : "min"}
            </button>
          )}
          {onSearch && (
            <button
              onClick={onSearch}
              className="w-11 h-11 rounded-full bg-[#1a1a1a] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
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
              className="w-11 h-11 rounded-full bg-[#1a1a1a] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {minimumMode && (
        <div className="mt-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/15 rounded-lg">
          <p className="text-[11px] text-amber-400/80">
            Minimum mode — showing floor versions only. Auto-resets tomorrow.
          </p>
        </div>
      )}
    </header>
  );
}
