"use client";

import { useCallback } from "react";
import type { ReactNode } from "react";
import { useStats, type DayCell, type HabitStat, type QuitCell, type QuitStat } from "@/lib/hooks/use-stats";
import { useSystemHealth } from "@/lib/hooks/use-system-health";
import { useRootCauses } from "@/lib/hooks/use-root-causes";
import { useHabitDependencies } from "@/lib/hooks/use-habit-dependencies";
import { useGun } from "@/lib/gun/gun-provider";
import { cn } from "@/lib/utils";
import { HabitIcon } from "@/lib/utils/habit-icons";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Heatmap geometry. Every offset below is derived from these; never hardcode a pitch.
const CELL_SIZE = 11;
const CELL_GAP = 3;
const DAY_LABEL_WIDTH = 14;
const COLUMN_PITCH = CELL_SIZE + CELL_GAP;
const GUTTER = DAY_LABEL_WIDTH + CELL_GAP;

const LEVEL_FILLS = [
  "var(--secondary)",
  "color-mix(in srgb, var(--primary) 14%, transparent)",
  "color-mix(in srgb, var(--primary) 30%, transparent)",
  "color-mix(in srgb, var(--primary) 55%, transparent)",
  "var(--primary)",
];

// Inverted grid: clean sits back, a slip is the only loud thing in it.
const QUIT_UNTRACKED = "var(--secondary)";
const QUIT_CLEAN = "color-mix(in srgb, var(--primary) 20%, transparent)";
const QUIT_SLIP = "var(--destructive)";

const TREND_ARROWS: Record<string, string> = { up: "↑", down: "↓", flat: "" };

const INACTIVE_THRESHOLD = 10;

function cellLevel(pct: number, total: number): number {
  if (total === 0) return 0;
  if (pct >= 80) return 4;
  if (pct >= 60) return 3;
  if (pct >= 40) return 2;
  if (pct > 0) return 1;
  return 0;
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="px-5 pt-7 pb-2 text-micro text-ink-3">{children}</p>;
}

function Fact({ children }: { children: ReactNode }) {
  return <span className="font-mono font-medium text-foreground">{children}</span>;
}

function Separator() {
  return <span className="text-ink-3">&middot;</span>;
}

function Heatmap({ cells, daysTracked, avgCompletion }: {
  cells: DayCell[];
  daysTracked: number;
  avgCompletion: number;
}) {
  const weeks: { date: string; level: number }[][] = [];
  let week: { date: string; level: number }[] = [];

  for (const cell of cells) {
    week.push({ date: cell.dateKey, level: cellLevel(cell.completionPct, cell.total) });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  // Label a month only at the column whose week opens in its first 7 days, so months never collide.
  const monthPositions: { label: string; col: number }[] = [];
  const labelled = new Set<string>();
  weeks.forEach((w, i) => {
    const [year, month, day] = w[0].date.split("-").map(Number);
    const key = `${year}-${month}`;
    if (day <= 7 && !labelled.has(key)) {
      labelled.add(key);
      monthPositions.push({ label: MONTH_LABELS[month - 1], col: i });
    }
  });

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div style={{ minWidth: GUTTER + weeks.length * COLUMN_PITCH }}>
          <div className="relative mb-1 h-4">
            {monthPositions.map((mp) => (
              <span
                key={mp.col}
                className="absolute text-micro text-muted-foreground"
                style={{ left: GUTTER + mp.col * COLUMN_PITCH }}
              >
                {mp.label}
              </span>
            ))}
          </div>
          <div className="flex" style={{ gap: CELL_GAP }}>
            <div className="flex shrink-0 flex-col" style={{ gap: CELL_GAP, width: DAY_LABEL_WIDTH }}>
              {["", "M", "", "W", "", "F", ""].map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-end text-micro leading-none text-ink-3"
                  style={{ height: CELL_SIZE }}
                >
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: CELL_GAP }}>
                {w.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className="rounded-[2px]"
                    style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: LEVEL_FILLS[day.level] }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-micro text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Less</span>
          {LEVEL_FILLS.map((fill, i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{ width: CELL_SIZE - 2, height: CELL_SIZE - 2, backgroundColor: fill }}
            />
          ))}
          <span>More</span>
        </div>
        <span>
          {daysTracked}d tracked <span className="text-ink-3">&middot;</span> {avgCompletion}% avg
        </span>
      </div>
    </div>
  );
}

function ConsistencyRow({ habit, rank, onArchive }: {
  habit: HabitStat;
  rank: number;
  onArchive: (id: string) => void;
}) {
  const inactive = habit.completionRate < INACTIVE_THRESHOLD;

  return (
    <div className="py-2">
      <div className="flex items-center gap-3">
        <span className="w-4 shrink-0 text-right font-mono text-label text-ink-3">{rank}</span>
        <span className={cn("shrink-0", inactive ? "text-ink-3" : "text-muted-foreground")}>
          <HabitIcon name={habit.name} size={16} />
        </span>
        <span className={cn("flex-1 truncate text-body", inactive && "text-ink-3")}>{habit.name}</span>
        {habit.decayWarning && (
          <span
            className="shrink-0 font-mono text-micro text-chart-2"
            title={`${habit.decayWarning.prior}% to ${habit.decayWarning.recent}%`}
          >
            {"↓"}{habit.decayWarning.recent}%
          </span>
        )}
        {!habit.decayWarning && habit.hasFrictionWarning && (
          <span className="shrink-0 text-micro text-chart-2">{"⚠"}</span>
        )}
        {inactive ? (
          <button
            onClick={() => onArchive(habit.id)}
            className="relative shrink-0 rounded-sm border border-border px-2 py-1 text-micro text-muted-foreground transition-colors active:bg-secondary after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-['']"
          >
            Archive
          </button>
        ) : (
          <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{ width: `${habit.completionRate}%`, backgroundColor: "var(--primary)" }}
            />
          </div>
        )}
        <span className="w-9 shrink-0 text-right font-mono text-label text-muted-foreground">
          {habit.completionRate}%
        </span>
      </div>
      {habit.longTermFriction && (
        <p className="ml-7 text-micro text-muted-foreground">
          hard for {habit.longTermFriction.weeks} week{habit.longTermFriction.weeks !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

function QuitRow({ stat, rank }: { stat: QuitStat; rank: number }) {
  const broke = stat.cleanDays === 0;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-4 shrink-0 text-right font-mono text-label text-ink-3">{rank}</span>
      <span className="shrink-0 text-muted-foreground">
        <HabitIcon name={stat.name} size={16} />
      </span>
      <span className="flex-1 truncate text-body">{stat.name}</span>
      <span
        className={cn(
          "shrink-0 font-mono text-micro",
          broke ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {stat.cleanDays}d
      </span>
      <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full"
          style={{
            width: `${stat.cleanRate}%`,
            backgroundColor: broke ? "var(--destructive)" : "var(--primary)",
          }}
        />
      </div>
      <span className="w-9 shrink-0 text-right font-mono text-label text-muted-foreground">
        {stat.cleanRate}%
      </span>
    </div>
  );
}

function quitFill(cell: QuitCell): string {
  if (!cell.tracked) return QUIT_UNTRACKED;
  return cell.slipped ? QUIT_SLIP : QUIT_CLEAN;
}

function QuitHeatmap({ stat }: { stat: QuitStat }) {
  const weeks: QuitCell[][] = [];
  let week: QuitCell[] = [];

  for (const cell of stat.cells) {
    week.push(cell);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="mb-3 text-label text-muted-foreground">
        {stat.name} <span className="text-ink-3">&middot;</span> last {weeks.length} weeks
      </p>
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="flex" style={{ gap: CELL_GAP, minWidth: weeks.length * COLUMN_PITCH }}>
          {weeks.map((w, wi) => (
            <div key={wi} className="flex flex-col" style={{ gap: CELL_GAP }}>
              {w.map((cell) => (
                <div
                  key={cell.dateKey}
                  className="rounded-[2px]"
                  style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: quitFill(cell) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-micro text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>Clean</span>
          <div
            className="rounded-[2px]"
            style={{ width: CELL_SIZE - 2, height: CELL_SIZE - 2, backgroundColor: QUIT_CLEAN }}
          />
          <div
            className="rounded-[2px]"
            style={{ width: CELL_SIZE - 2, height: CELL_SIZE - 2, backgroundColor: QUIT_SLIP }}
          />
          <span>Slipped</span>
        </div>
        <span>
          {stat.slips} slip{stat.slips === 1 ? "" : "s"} <span className="text-ink-3">&middot;</span>{" "}
          longest {stat.longestClean}d
        </span>
      </div>
    </div>
  );
}

function LinkRow({ children }: { children: ReactNode }) {
  return <div className="border-b border-border py-3 last:border-b-0">{children}</div>;
}

export function StatsPage({ onReflect }: { onReflect?: () => void } = {}) {
  const stats = useStats();
  const health = useSystemHealth();
  const { causes: rootCauses } = useRootCauses();
  const { boosters, breakers } = useHabitDependencies();
  const gun = useGun();

  const handleArchive = useCallback(
    (id: string) => {
      gun?.get("habits").get(id).put({ archived: true });
    },
    [gun]
  );

  if (stats.loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const missCauses = rootCauses.filter((c) => c.kind !== "slip");
  const slipCauses = rootCauses.filter((c) => c.kind === "slip");
  const hasDayPattern = stats.bestDay !== "-" && stats.worstDay !== "-";
  const hasMovers = stats.keystoneHabits.length > 0 || boosters.length > 0 || breakers.length > 0;

  return (
    <div className="h-full overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
      <header className="px-5" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
        <h1 className="text-page-title font-semibold tracking-tight">Stats</h1>
      </header>

      <div className="px-5 pt-5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-display font-semibold tracking-tight">{stats.currentStreak}</span>
          <span className="text-title font-medium text-muted-foreground">day streak</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 text-label text-muted-foreground">
          <span>Best <Fact>{stats.bestStreak}d</Fact></span>
          <Separator />
          <span>Avg <Fact>{stats.avgCompletion}%</Fact></span>
          <Separator />
          <span><Fact>{stats.daysTracked}</Fact> days tracked</span>
        </div>

        {hasDayPattern && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-label text-muted-foreground">
            <span>Strongest on <Fact>{stats.bestDay}</Fact></span>
            <Separator />
            <span>weakest on <Fact>{stats.worstDay}</Fact></span>
          </div>
        )}

        {!health.loading && health.score >= 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-label text-muted-foreground">
            <span>System health <Fact>{health.score}</Fact></span>
            <Separator />
            <span>{health.status} {TREND_ARROWS[health.trend]}</span>
          </div>
        )}

        {onReflect && (
          <button
            onClick={onReflect}
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-label font-medium"
            style={{ color: "var(--primary)" }}
          >
            Reflect on this week <span aria-hidden="true">{"→"}</span>
          </button>
        )}
      </div>

      <div className="px-5 pt-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <Heatmap
            cells={stats.heatmapCells}
            daysTracked={stats.daysTracked}
            avgCompletion={stats.avgCompletion}
          />
        </div>
      </div>

      {stats.habitStats.length > 0 && (
        <>
          <GroupLabel>Consistency</GroupLabel>
          <div className="px-5">
            {stats.habitStats.map((h, i) => (
              <ConsistencyRow key={h.id} habit={h} rank={i + 1} onArchive={handleArchive} />
            ))}
          </div>
        </>
      )}

      {stats.quitStats.length > 0 && (
        <>
          <GroupLabel>Staying clean</GroupLabel>
          <div className="px-5">
            {stats.quitStats.map((q, i) => (
              <QuitRow key={q.id} stat={q} rank={i + 1} />
            ))}
          </div>
          <div className="space-y-3 px-5 pt-4">
            {stats.quitStats.map((q) => (
              <QuitHeatmap key={q.id} stat={q} />
            ))}
          </div>
        </>
      )}

      {hasMovers && (
        <>
          <GroupLabel>What moves what</GroupLabel>
          <div className="px-5">
            {stats.keystoneHabits.map((k) => (
              <LinkRow key={k.id}>
                <div className="flex flex-wrap items-center gap-2 text-body">
                  <span className="text-muted-foreground"><HabitIcon name={k.name} size={16} /></span>
                  <span>{k.name}</span>
                  <span className="text-label text-ink-3">{"→"}</span>
                  <span className="text-muted-foreground">everything else</span>
                  <span className="ml-auto font-mono text-label" style={{ color: "var(--primary)" }}>
                    +{k.impact}%
                  </span>
                </div>
                <p className="mt-1 text-label text-muted-foreground">
                  {k.completionWith}% with, {k.completionWithout}% without <span className="text-ink-3">&middot;</span> {k.confidence} confidence
                </p>
              </LinkRow>
            ))}

            {[...boosters, ...breakers].map((dep) => (
              <LinkRow key={`${dep.sourceId}-${dep.targetId}`}>
                <div className="flex flex-wrap items-center gap-2 text-body">
                  <span className="text-muted-foreground"><HabitIcon name={dep.sourceName} size={16} /></span>
                  <span>{dep.sourceName}</span>
                  <span className="text-label text-ink-3">{"→"}</span>
                  <span className="text-muted-foreground"><HabitIcon name={dep.targetName} size={16} /></span>
                  <span>{dep.targetName}</span>
                  <span
                    className={cn(
                      "ml-auto font-mono text-label",
                      dep.direction === "negative" && "text-destructive"
                    )}
                    style={dep.direction === "negative" ? undefined : { color: "var(--primary)" }}
                  >
                    {dep.direction === "negative" ? "" : "+"}{dep.impact}%
                  </span>
                </div>
                <p className="mt-1 text-label text-muted-foreground">{dep.suggestion}</p>
              </LinkRow>
            ))}
          </div>
        </>
      )}

      {missCauses.length > 0 && (
        <>
          <GroupLabel>Why you miss</GroupLabel>
          <div className="px-5">
            {missCauses.map((cause, i) => (
              <LinkRow key={`${cause.habitId}-${i}`}>
                <div className="flex flex-wrap items-center gap-2 text-body">
                  <span className="text-muted-foreground"><HabitIcon name={cause.habitName} size={16} /></span>
                  <span>{cause.habitName}</span>
                  <span className="text-label text-muted-foreground">{cause.pattern}</span>
                  {cause.confidence === "high" && (
                    <span className="ml-auto font-mono text-micro text-ink-3">high</span>
                  )}
                </div>
                {cause.suggestion && (
                  <p className="mt-1 text-label text-muted-foreground">{cause.suggestion}</p>
                )}
              </LinkRow>
            ))}
          </div>
        </>
      )}

      {slipCauses.length > 0 && (
        <>
          <GroupLabel>Why you slip</GroupLabel>
          <div className="px-5">
            {slipCauses.map((cause, i) => (
              <LinkRow key={`${cause.habitId}-${i}`}>
                <div className="flex flex-wrap items-center gap-2 text-body">
                  <span className="text-muted-foreground"><HabitIcon name={cause.habitName} size={16} /></span>
                  <span>{cause.habitName}</span>
                  <span className="text-label text-muted-foreground">{cause.pattern}</span>
                  {cause.confidence === "high" && (
                    <span className="ml-auto font-mono text-micro text-ink-3">high</span>
                  )}
                </div>
                {cause.suggestion && (
                  <p className="mt-1 text-label text-muted-foreground">{cause.suggestion}</p>
                )}
              </LinkRow>
            ))}
          </div>
        </>
      )}

      {stats.habitTimings.length > 0 && (
        <>
          <GroupLabel>When you usually do them</GroupLabel>
          <div className="px-5">
            {stats.habitTimings.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2">
                <span className="text-muted-foreground"><HabitIcon name={t.name} size={16} /></span>
                <span className="flex-1 truncate text-body text-muted-foreground">{t.name}</span>
                <span className="font-mono text-label text-foreground">{t.usualLabel}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
