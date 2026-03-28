"use client";

import { useCallback } from "react";
import { useStats, type DayCell } from "@/lib/hooks/use-stats";
import { useSystemHealth } from "@/lib/hooks/use-system-health";
import { useRootCauses } from "@/lib/hooks/use-root-causes";
import { useHabitDependencies } from "@/lib/hooks/use-habit-dependencies";
import { useGun } from "@/lib/gun/gun-provider";
import { cn } from "@/lib/utils";
import { HabitIcon } from "@/lib/utils/habit-icons";

const GREEN_SCALE = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function cellLevel(pct: number, total: number): number {
  if (total === 0) return 0;
  if (pct >= 80) return 4;
  if (pct >= 60) return 3;
  if (pct >= 40) return 2;
  if (pct > 0) return 1;
  return 0;
}

const GROUP_COLORS: Record<string, string> = {
  morning: "#2dd4bf",
  evening: "#d4a72d",
  anytime: "#e87d7d",
};

function Heatmap({ cells, daysTracked, avgCompletion }: {
  cells: DayCell[];
  daysTracked: number;
  avgCompletion: number;
}) {
  const mapped = cells.map((c) => ({
    date: c.dateKey,
    level: cellLevel(c.completionPct, c.total),
  }));

  const weeks: { date: string; level: number }[][] = [];
  let week: { date: string; level: number }[] = [];

  for (const cell of mapped) {
    week.push(cell);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  const monthPositions: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((w, i) => {
    const m = new Date(w[0].date).getMonth();
    if (m !== lastMonth) {
      monthPositions.push({ label: MONTH_LABELS[m], col: i });
      lastMonth = m;
    }
  });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div style={{ minWidth: `${weeks.length * 13 + 28}px` }}>
          {/* Month labels */}
          <div className="flex pl-7 mb-1 relative h-4">
            {monthPositions.map((mp, i) => (
              <span
                key={i}
                className="text-[10px] text-muted-foreground absolute"
                style={{ left: `${mp.col * 13 + 28}px` }}
              >
                {mp.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] pr-1 shrink-0">
              {["", "M", "", "W", "", "F", ""].map((d, i) => (
                <div key={i} className="w-3 h-[11px] text-[9px] text-muted-foreground flex items-center justify-end">
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {w.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className="w-[11px] h-[11px] rounded-[2px]"
                    style={{ backgroundColor: GREEN_SCALE[day.level] }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {GREEN_SCALE.map((c, i) => (
            <div key={i} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {daysTracked}d tracked &middot; {avgCompletion}% avg
        </span>
      </div>
    </div>
  );
}

export function StatsPage({ onReflect }: { onReflect?: () => void } = {}) {
  const stats = useStats();
  const health = useSystemHealth();
  const { causes: rootCauses } = useRootCauses();
  const { boosters, breakers } = useHabitDependencies();
  const gun = useGun();

  const inactiveHabits = stats.habitStats.filter((h) => h.completionRate < 10);

  const handleArchive = useCallback(
    (id: string) => {
      gun?.get("habits").get(id).put({ archived: true });
    },
    [gun]
  );

  if (stats.loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <header className="px-5 pb-1" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
        <h1 className="text-xl font-semibold tracking-tight">Stats</h1>
      </header>

      {/* Hero streak */}
      <div className="px-5 py-6">
        <div className="flex items-baseline gap-2">
          <span className="text-6xl font-bold font-mono tracking-tighter">
            {stats.currentStreak}
          </span>
          <span className="text-lg text-muted-foreground">day streak</span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
          <span>Best: <span className="text-foreground font-mono">{stats.bestStreak}d</span></span>
          <span>&middot;</span>
          <span>Avg: <span className="text-foreground font-mono">{stats.avgCompletion}%</span></span>
          <span>&middot;</span>
          <span><span className="text-foreground font-mono">{stats.daysTracked}</span> days</span>
        </div>
        {stats.bestDay && stats.worstDay && (
          <p className="text-sm text-muted-foreground mt-2">
            Best on <span className="text-foreground font-medium">{stats.bestDay}</span>
            {" · "}
            worst on <span className="text-foreground font-medium">{stats.worstDay}</span>
          </p>
        )}
        {!health.loading && health.score >= 0 && (
          <p className="text-sm text-muted-foreground mt-1.5">
            System: <span className="font-mono font-medium" style={{ color: "var(--primary)" }}>{health.score}</span>
            <span className="text-muted-foreground/60"> · {health.status}{health.trend !== "flat" ? (health.trend === "up" ? " ↑" : " ↓") : ""}</span>
          </p>
        )}
        {onReflect && (
          <button
            onClick={onReflect}
            className="mt-3 text-xs font-medium transition-colors"
            style={{ color: "var(--primary)" }}
          >
            Reflect on this week →
          </button>
        )}
      </div>

      {/* Heatmap — the centerpiece */}
      <div className="px-5 mb-8">
        <div className="bg-[#141414] rounded-2xl border border-[#262626] p-4">
          <Heatmap
            cells={stats.heatmapCells}
            daysTracked={stats.daysTracked}
            avgCompletion={stats.avgCompletion}
          />
        </div>
      </div>

      {/* Habits — ranked, minimal */}
      <div className="px-5 mb-8">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Consistency
        </h2>
        <div className="space-y-1">
          {stats.habitStats.map((h, i) => (
            <div
              key={h.id}
              className="px-3 py-2.5 rounded-xl hover:bg-[#141414] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm w-5 text-right text-muted-foreground font-mono">{i + 1}</span>
                <span className="text-sm text-muted-foreground"><HabitIcon name={h.name} size={16} /></span>
                <span className="text-sm flex-1 truncate">{h.name}</span>
                {h.decayWarning && (
                  <span className="text-amber-400 text-[10px] whitespace-nowrap" title={`${h.decayWarning.prior}% → ${h.decayWarning.recent}%`}>
                    {"↓"}{h.decayWarning.recent}%
                  </span>
                )}
                {!h.decayWarning && h.hasFrictionWarning && (
                  <span className="text-amber-400 text-xs">{"⚠"}</span>
                )}
                <div className="w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${h.completionRate}%`,
                      backgroundColor: GROUP_COLORS[h.group] || "#2dd4bf",
                    }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                  {h.completionRate}%
                </span>
              </div>
              {h.longTermFriction && (
                <p className="text-amber-400/60 text-[10px] ml-[calc(1.25rem+0.75rem)]">
                  hard for {h.longTermFriction.weeks} week{h.longTermFriction.weeks !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Changing — behavioral patterns */}
      {rootCauses.length > 0 && (
        <div className="px-5 mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Changing
          </h2>
          <div className="space-y-1">
            {rootCauses.map((cause, i) => (
              <div
                key={`${cause.habitId}-${i}`}
                className="px-3 py-2.5 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    <HabitIcon name={cause.habitName} size={16} />
                  </span>
                  <span className="text-sm flex-1">
                    <span className="font-medium">{cause.habitName}</span>
                    <span className="text-muted-foreground"> — {cause.pattern}</span>
                  </span>
                  {cause.confidence === "high" && (
                    <span className="text-[10px] text-muted-foreground/60 font-mono">high</span>
                  )}
                </div>
                {cause.suggestion && (
                  <p className="text-xs text-muted-foreground/60 mt-1 ml-[calc(16px+0.75rem)]">
                    {cause.suggestion}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helps — keystone habits */}
      {stats.keystoneHabits.length > 0 && (
        <div className="px-5 mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Helps
          </h2>
          <div className="bg-[#141414] rounded-2xl border border-[#262626] p-4 space-y-3">
            <p className="text-[11px] text-muted-foreground/60">
              These boost everything else when done
            </p>
            {stats.keystoneHabits.map((k) => (
              <div key={k.id} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground"><HabitIcon name={k.name} size={16} /></span>
                <span className="text-sm flex-1">{k.name}</span>
                <div className="text-right">
                  <span className="text-xs font-mono" style={{ color: "var(--primary)" }}>+{k.impact}%</span>
                  <p className="text-[10px] text-muted-foreground">
                    {k.completionWith}% with &middot; {k.completionWithout}% without
                    <span className="text-muted-foreground/40"> &middot; {k.confidence}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connections */}
      {(boosters.length > 0 || breakers.length > 0) && (
        <div className="px-5 mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Connections
          </h2>
          {boosters.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5 px-3">
                Helps
              </p>
              <div className="space-y-1">
                {boosters.map((dep) => (
                  <div key={`${dep.sourceId}-${dep.targetId}`} className="px-3 py-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground"><HabitIcon name={dep.sourceName} size={16} /></span>
                      <span className="text-sm">{dep.sourceName}</span>
                      <span className="text-xs text-muted-foreground">{"\u2192"}</span>
                      <span className="text-sm text-muted-foreground"><HabitIcon name={dep.targetName} size={16} /></span>
                      <span className="text-sm flex-1">{dep.targetName}</span>
                      <span className="text-xs font-mono" style={{ color: "var(--primary)" }}>
                        +{dep.impact}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-1 ml-[calc(16px+0.5rem)]">
                      {dep.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {breakers.length > 0 && (
            <div>
              <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1.5 px-3">
                Hurts
              </p>
              <div className="space-y-1">
                {breakers.map((dep) => (
                  <div key={`${dep.sourceId}-${dep.targetId}`} className="px-3 py-2.5 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground"><HabitIcon name={dep.sourceName} size={16} /></span>
                      <span className="text-sm">{dep.sourceName}</span>
                      <span className="text-xs text-muted-foreground">{"\u2192"}</span>
                      <span className="text-sm text-muted-foreground"><HabitIcon name={dep.targetName} size={16} /></span>
                      <span className="text-sm flex-1">{dep.targetName}</span>
                      <span className="text-xs font-mono text-red-400/70">
                        {dep.impact}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-1 ml-[calc(16px+0.5rem)]">
                      {dep.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timing */}
      {stats.habitTimings.length > 0 && (
        <div className="px-5 mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Timing
          </h2>
          <div className="space-y-1">
            {stats.habitTimings.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl"
              >
                <span className="text-sm text-muted-foreground"><HabitIcon name={t.name} size={16} /></span>
                <span className="text-sm flex-1 truncate text-muted-foreground">{t.name}</span>
                <span className="text-xs font-mono text-foreground">{t.usualLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive */}
      {inactiveHabits.length > 0 && (
        <div className="px-5 mb-8">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Inactive
          </h2>
          <div className="space-y-1">
            {inactiveHabits.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#141414] transition-colors"
              >
                <span className="text-sm text-muted-foreground"><HabitIcon name={h.name} size={16} /></span>
                <span className="text-sm flex-1 truncate">{h.name}</span>
                <span className="text-[10px] text-muted-foreground/50">inactive</span>
                <button
                  onClick={() => handleArchive(h.id)}
                  className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors px-1.5 py-0.5 rounded border border-[#262626] hover:border-[#363636]"
                >
                  archive
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
