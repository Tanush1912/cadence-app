"use client";

const GRID_ACTIVE = "color-mix(in srgb, var(--primary) 82%, transparent)";
const GRID_INACTIVE = "color-mix(in srgb, var(--primary) 10%, transparent)";
const STRIP_ACTIVE = "color-mix(in srgb, var(--primary) 90%, transparent)";
/** Inverted mode: clean days sit back so a slip is the only loud thing in the grid. */
const CLEAN_FILL = "color-mix(in srgb, var(--primary) 20%, transparent)";
const SLIP_FILL = "var(--destructive)";
const UNTRACKED_FILL = "var(--surface-3)";
const STRIP_DAYS = 14;

/** Right-align `data` inside a fixed window, oldest first, dropping anything older. */
function windowed(data: boolean[], days: number): boolean[] {
  const out: boolean[] = Array(days).fill(false);
  const recent = data.length > days ? data.slice(data.length - days) : data;
  const offset = days - recent.length;
  for (let i = 0; i < recent.length; i++) out[offset + i] = recent[i];
  return out;
}

/**
 * Completion history for a single habit. `grid` is the full contribution grid;
 * `compact` is the 14-day recency strip used by minimum mode.
 */
export function MiniHeatmap({
  data,
  days = 56,
  columns = 14,
  variant = "grid",
  inverted = false,
  activeFrom = 0,
}: {
  data: boolean[];
  /** Ignored. Colour comes from --primary so it can never desync from the accent. */
  accentColor?: string;
  days?: number;
  columns?: number;
  variant?: "grid" | "compact";
  /** Quit habits: `data` marks slips, not completions. Clean is the default state. */
  inverted?: boolean;
  /** Index of the first tracked day. Anything earlier predates the habit. */
  activeFrom?: number;
}) {
  if (variant === "compact") {
    const strip = windowed(data, STRIP_DAYS);
    const stripOffset = activeFrom - (days - STRIP_DAYS);

    return (
      <div className="mt-2 flex gap-[3px]">
        {strip.map((active, i) => (
          <span
            key={i}
            className="block h-1 w-1 rounded-[1px]"
            style={{
              backgroundColor: inverted
                ? i < stripOffset
                  ? UNTRACKED_FILL
                  : active
                    ? SLIP_FILL
                    : CLEAN_FILL
                : active
                  ? STRIP_ACTIVE
                  : UNTRACKED_FILL,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="grid w-full gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {windowed(data, days).map((active, i) => (
        <div
          key={i}
          className="aspect-square rounded-[2px]"
          style={{
            backgroundColor: inverted
              ? i < activeFrom
                ? UNTRACKED_FILL
                : active
                  ? SLIP_FILL
                  : CLEAN_FILL
              : active
                ? GRID_ACTIVE
                : GRID_INACTIVE,
          }}
        />
      ))}
    </div>
  );
}
