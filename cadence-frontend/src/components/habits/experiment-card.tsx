"use client";

import { useMemo } from "react";
import { todayKey, fromDateKey } from "@/lib/utils/dates";
import type { Experiment } from "@/lib/hooks/use-experiments";

interface ExperimentCardProps {
  experiment: Experiment;
  habitName: string;
  habitEmoji: string;
  onEnd: (experimentId: string, keep: boolean) => void;
}

export function ExperimentCard({
  experiment,
  habitName,
  habitEmoji,
  onEnd,
}: ExperimentCardProps) {
  const today = todayKey();
  const isComplete = !experiment.active || today > experiment.endDate;
  const hasResult = experiment.result !== undefined;

  const dayNumber = useMemo(() => {
    const start = fromDateKey(experiment.startDate);
    const now = fromDateKey(today);
    const diff = Math.floor(
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(1, Math.min(diff + 1, 14));
  }, [experiment.startDate, today]);

  if (!isComplete && !hasResult) {
    return (
      <div className="rounded-xl border border-violet-500/15 bg-violet-500/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-violet-300">
              <span className="mr-1.5">{"🧪"}</span>
              Experiment: {habitEmoji} {habitName} → {experiment.change}
            </p>
            <p className="mt-1 text-xs text-violet-300/70">
              Day {dayNumber} of 14 · baseline: {experiment.baselineRate}%
            </p>
          </div>
          <button
            onClick={() => onEnd(experiment.id, false)}
            className="shrink-0 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300 transition-colors hover:bg-violet-500/20"
          >
            End early
          </button>
        </div>
      </div>
    );
  }

  const resultRate = experiment.result ?? 0;
  const diff = resultRate - experiment.baselineRate;
  const isPositive = diff > 0;
  const isNeutral = diff === 0;

  return (
    <div className="rounded-xl border border-violet-500/15 bg-violet-500/10 p-4">
      <div className="mb-3">
        <p className="text-sm font-medium text-violet-300">
          <span className="mr-1.5">{"🧪"}</span>
          Result: {habitEmoji} {habitName} → {experiment.change}
        </p>
        <p className="mt-1 text-xs">
          <span className="text-violet-300/70">Before: </span>
          <span className="text-violet-300">{experiment.baselineRate}%</span>
          <span className="text-violet-300/70"> → After: </span>
          <span className="text-violet-300">{resultRate}%</span>
          <span
            className={
              isPositive
                ? "ml-1.5 text-emerald-400"
                : isNeutral
                ? "ml-1.5 text-violet-300/70"
                : "ml-1.5 text-red-400"
            }
          >
            ({isPositive ? "+" : ""}
            {diff}%)
          </span>
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onEnd(experiment.id, true)}
          className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
        >
          Keep change
        </button>
        <button
          onClick={() => onEnd(experiment.id, false)}
          className="flex-1 rounded-lg bg-[#262626] px-3 py-2 text-xs font-medium text-[#fafafa] transition-colors hover:bg-[#303030]"
        >
          Revert
        </button>
      </div>
    </div>
  );
}
