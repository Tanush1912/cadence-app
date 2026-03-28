"use client";

import { useState, useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import { useExperiments } from "@/lib/hooks/use-experiments";
import { ExperimentCard } from "@/components/habits/experiment-card";
import { HabitIcon } from "@/lib/utils/habit-icons";
import { cn } from "@/lib/utils";
import type { GroupName } from "@/lib/types";

const GROUP_OPTIONS: { value: GroupName; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "anytime", label: "Anytime" },
];

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly:3", label: "3x / week" },
  { value: "weekly:5", label: "5x / week" },
];

export function ExperimentCreator() {
  const { habits } = useSharedData();
  const { activeExperiment, isExpired, createExperiment, endExperiment, loading } = useExperiments();

  const [selectedHabitId, setSelectedHabitId] = useState("");
  const [changeType, setChangeType] = useState<"group" | "frequency">("group");
  const [newValue, setNewValue] = useState("");
  const [showHabitPicker, setShowHabitPicker] = useState(false);

  const activeHabits = useMemo(
    () => Object.values(habits).filter((h) => !h.archived),
    [habits]
  );

  const selectedHabit = selectedHabitId ? habits[selectedHabitId] : null;

  const changeLabel = useMemo(() => {
    if (!selectedHabit || !newValue) return "";
    if (changeType === "group") return `moved to ${newValue}`;
    const opt = FREQUENCY_OPTIONS.find((o) => o.value === newValue);
    return `changed to ${opt?.label ?? newValue}`;
  }, [selectedHabit, newValue, changeType]);

  const handleCreate = () => {
    if (!selectedHabitId || !newValue || !changeLabel) return;
    createExperiment(selectedHabitId, changeType, newValue, changeLabel);
    setSelectedHabitId("");
    setNewValue("");
  };

  const activeHabit = activeExperiment ? habits[activeExperiment.habitId] : null;

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-[#262626] bg-[#141414] p-4">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Experiments
      </h3>

      {activeExperiment && activeHabit && (
        <div className="mb-4">
          <ExperimentCard
            experiment={activeExperiment}
            habitName={activeHabit.name}
            habitEmoji={activeHabit.emoji}
            onEnd={endExperiment}
          />
          {isExpired && (
            <p className="mt-2 text-xs text-amber-400">
              This experiment has ended. Review the results above.
            </p>
          )}
        </div>
      )}

      {!activeExperiment && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Test a change to a habit for 2 weeks, then see if it improved consistency.
          </p>

          {/* Custom habit picker */}
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Habit</label>
            <button
              onClick={() => setShowHabitPicker(!showHabitPicker)}
              className="w-full flex items-center justify-between rounded-xl border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 text-sm text-left transition-colors hover:border-[#333]"
            >
              {selectedHabit ? (
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground"><HabitIcon name={selectedHabit.name} size={14} /></span>
                  {selectedHabit.name}
                </span>
              ) : (
                <span className="text-muted-foreground">Select a habit...</span>
              )}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
                <polyline points={showHabitPicker ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
              </svg>
            </button>

            {showHabitPicker && (
              <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] max-h-48 overflow-y-auto">
                {activeHabits.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => {
                      setSelectedHabitId(h.id);
                      setNewValue("");
                      setShowHabitPicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors hover:bg-[#1a1a1a]",
                      selectedHabitId === h.id && "bg-[#1a1a1a]"
                    )}
                  >
                    <span className="text-muted-foreground"><HabitIcon name={h.name} size={14} /></span>
                    {h.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedHabit && (
            <>
              {/* Change type */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">What to change</label>
                <div className="flex gap-2">
                  {(["group", "frequency"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setChangeType(t); setNewValue(""); }}
                      className={cn(
                        "flex-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors border",
                        changeType === t
                          ? "bg-violet-500/15 text-violet-300 border-violet-500/20"
                          : "bg-[#262626] text-foreground border-transparent hover:bg-[#303030]"
                      )}
                    >
                      {t === "group" ? "Time of day" : "Frequency"}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Currently: <span className="text-foreground">{changeType === "group" ? selectedHabit.group : selectedHabit.frequency}</span>
              </p>

              {/* New value — custom buttons, not native select */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  {changeType === "group" ? "Move to" : "Change to"}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(changeType === "group"
                    ? GROUP_OPTIONS.filter((o) => o.value !== selectedHabit.group)
                    : FREQUENCY_OPTIONS.filter((o) => o.value !== selectedHabit.frequency)
                  ).map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setNewValue(o.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        newValue === o.value
                          ? "bg-foreground text-background border-foreground"
                          : "bg-[#1a1a1a] text-muted-foreground border-transparent hover:text-foreground"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!newValue}
                className="w-full rounded-xl bg-violet-500/15 px-4 py-2.5 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start 2-week experiment
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
