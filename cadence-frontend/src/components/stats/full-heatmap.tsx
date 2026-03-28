"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { fromDateKey } from "@/lib/utils/dates";
import type { DayCell } from "@/lib/hooks/use-stats";

/**
 * GitHub-style yearly contribution heatmap.
 * 52+ columns (weeks) x 7 rows (days).
 * Color scale: 5 levels from empty (#161b22) to max (#39d353).
 */

const LEVELS = [
  "#161b22",
  "#0e4429",
  "#006d32",
  "#26a641",
  "#39d353",
];

function getLevel(pct: number, hasData: boolean): number {
  if (!hasData || pct === 0) return 0;
  if (pct <= 25) return 1;
  if (pct <= 50) return 2;
  if (pct <= 75) return 3;
  return 4;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_LABELS = ["", "M", "", "W", "", "F", ""];

export function FullHeatmap({
  cells,
  daysTracked,
  avgCompletion,
}: {
  cells: DayCell[];
  daysTracked: number;
  avgCompletion: number;
}) {
  const { grid, monthPositions, totalWeeks } = useMemo(() => {
    if (cells.length === 0) {
      return { grid: [], monthPositions: [], totalWeeks: 0 };
    }

    const cellMap = new Map<string, DayCell>();
    for (const c of cells) {
      cellMap.set(c.dateKey, c);
    }

    const firstDate = fromDateKey(cells[0].dateKey);
    const lastDate = fromDateKey(cells[cells.length - 1].dateKey);

    const startDate = new Date(firstDate);
    const startDow = startDate.getDay();
    const isoStart = startDow === 0 ? 6 : startDow - 1;
    startDate.setDate(startDate.getDate() - isoStart);

    const weeks: Array<Array<{ dateKey: string; cell: DayCell | null; inRange: boolean }>> = [];
    const monthPos: Array<{ label: string; weekIdx: number }> = [];
    let currentMonth = -1;

    const cursor = new Date(startDate);
    let weekIdx = 0;

    while (cursor <= lastDate || weeks.length < 1) {
      const week: Array<{ dateKey: string; cell: DayCell | null; inRange: boolean }> = [];

      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        const d = String(cursor.getDate()).padStart(2, "0");
        const dk = `${y}-${m}-${d}`;
        const inRange = cursor >= firstDate && cursor <= lastDate;

        if (cursor.getMonth() !== currentMonth && inRange) {
          currentMonth = cursor.getMonth();
          monthPos.push({ label: MONTH_LABELS[currentMonth], weekIdx });
        }

        week.push({
          dateKey: dk,
          cell: cellMap.get(dk) || null,
          inRange,
        });

        cursor.setDate(cursor.getDate() + 1);
      }

      weeks.push(week);
      weekIdx++;

      if (cursor > lastDate && weeks.length >= 52) break;
    }

    return { grid: weeks, monthPositions: monthPos, totalWeeks: weeks.length };
  }, [cells]);

  if (cells.length === 0) {
    return (
      <div className="bg-[#141414] rounded-2xl border border-[#262626] px-4 py-8 text-center text-[#737373] text-sm">
        No data to display.
      </div>
    );
  }

  const cellSize = 11;
  const cellGap = 2;
  const dayLabelWidth = 24;
  const headerHeight = 16;
  const gridWidth = totalWeeks * (cellSize + cellGap);
  const gridHeight = 7 * (cellSize + cellGap);

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#262626] px-4 py-4 overflow-hidden">
      <div className="overflow-x-auto">
        <svg
          width={gridWidth + dayLabelWidth + 8}
          height={gridHeight + headerHeight + 8}
          className="block"
        >
          {/* Month labels */}
          {monthPositions.map((mp, i) => (
            <text
              key={i}
              x={dayLabelWidth + mp.weekIdx * (cellSize + cellGap)}
              y={10}
              className="fill-[#737373]"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              {mp.label}
            </text>
          ))}

          {/* Day labels (M, W, F) */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={i}
                x={0}
                y={headerHeight + i * (cellSize + cellGap) + cellSize - 1}
                className="fill-[#737373]"
                fontSize={9}
                fontFamily="Inter, sans-serif"
              >
                {label}
              </text>
            ) : null
          )}

          {/* Grid cells */}
          {grid.map((week, wIdx) =>
            week.map((day, dIdx) => {
              if (!day.inRange) return null;
              const pct = day.cell?.completionPct ?? 0;
              const hasData = day.cell !== null && day.cell.total > 0;
              const level = getLevel(pct, hasData);

              return (
                <rect
                  key={`${wIdx}-${dIdx}`}
                  x={dayLabelWidth + wIdx * (cellSize + cellGap)}
                  y={headerHeight + dIdx * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={2}
                  fill={LEVELS[level]}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Legend row */}
      <div className="flex items-center justify-between mt-3 text-xs text-[#737373]">
        <span className="font-mono">
          {daysTracked} days tracked &middot; {avgCompletion}% avg
        </span>
        <div className="flex items-center gap-1">
          <span className="mr-1">Less</span>
          {LEVELS.map((color, i) => (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-[2px]"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
    </div>
  );
}
