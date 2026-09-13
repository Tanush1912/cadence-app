"use client";

const GRID_ACTIVE = "color-mix(in srgb, var(--primary) 82%, transparent)";
const GRID_INACTIVE = "color-mix(in srgb, var(--primary) 10%, transparent)";
const STRIP_ACTIVE = "color-mix(in srgb, var(--primary) 90%, transparent)";
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
}: {
  data: boolean[];
  /** Ignored. Colour comes from --primary so it can never desync from the accent. */
  accentColor?: string;
  days?: number;
  columns?: number;
  variant?: "grid" | "compact";
}) {
  if (variant === "compact") {
    return (
      <div className="mt-2 flex gap-[3px]">
        {windowed(data, STRIP_DAYS).map((active, i) => (
          <span
            key={i}
            className="block h-1 w-1 rounded-[1px]"
            style={{ backgroundColor: active ? STRIP_ACTIVE : "var(--surface-3)" }}
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
          style={{ backgroundColor: active ? GRID_ACTIVE : GRID_INACTIVE }}
        />
      ))}
    </div>
  );
}
