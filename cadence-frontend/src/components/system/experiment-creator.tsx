"use client";

import { useState, useMemo } from "react";
import { useSharedData } from "@/lib/gun/data-provider";
import type { Experiment } from "@/lib/hooks/use-experiments";
import { ExperimentCard } from "@/components/habits/experiment-card";
import { HabitIcon } from "@/lib/utils/habit-icons";
import { SheetPrimaryButton } from "./settings-row";
import type { GroupName } from "@/lib/types";
import { ChevronDown, ChevronUp } from "lucide-react";

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

interface ExperimentCreatorProps {
  activeExperiment: Experiment | null;
  isExpired: boolean;
  createExperiment: (
    habitId: string,
    field: "group" | "frequency",
    newValue: string,
    change: string
  ) => void;
  endExperiment: (experimentId: string, keep: boolean) => void;
  loading?: boolean;
}

export function ExperimentCreator({
  activeExperiment,
  isExpired,
  createExperiment,
  endExperiment,
  loading,
}: ExperimentCreatorProps) {
  const { habits } = useSharedData();

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

  if (loading) {
    return <div className="mx-5 h-12 animate-pulse rounded-lg bg-secondary" />;
  }

  return (
    <div>
      {activeExperiment && activeHabit && (
        <div className="px-5 pb-2">
          <ExperimentCard
            experiment={activeExperiment}
            habitName={activeHabit.name}
            habitEmoji={activeHabit.emoji}
            onEnd={endExperiment}
          />
          {isExpired && (
            <p className="pt-2 text-label text-primary">
              This experiment has ended. Review the results above.
            </p>
          )}
        </div>
      )}

      {!activeExperiment && (
        <>
          <div className="px-5 pb-3">
            <span className="mb-2 block text-micro text-ink-3">Habit</span>
            <button
              type="button"
              onClick={() => setShowHabitPicker(!showHabitPicker)}
              className="flex min-h-12 w-full items-center gap-3 rounded-sm border border-border bg-background px-3 text-left text-body transition-colors active:bg-secondary"
            >
              {selectedHabit ? (
                <span className="flex min-w-0 flex-1 items-center gap-2 text-foreground">
                  <span className="flex text-muted-foreground">
                    <HabitIcon name={selectedHabit.name} size={16} />
                  </span>
                  <span className="truncate">{selectedHabit.name}</span>
                </span>
              ) : (
                <span className="flex-1 text-ink-3">Select a habit</span>
              )}
              {showHabitPicker ? (
                <ChevronUp className="size-4 shrink-0 text-ink-3" />
              ) : (
                <ChevronDown className="size-4 shrink-0 text-ink-3" />
              )}
            </button>

            {showHabitPicker && (
              <div className="mt-2 overflow-hidden rounded-sm border border-border bg-background">
                {activeHabits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setSelectedHabitId(h.id);
                      setNewValue("");
                      setShowHabitPicker(false);
                    }}
                    className={`flex min-h-12 w-full items-center gap-3 px-3 text-left text-body text-foreground transition-colors active:bg-secondary ${
                      selectedHabitId === h.id ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="flex text-muted-foreground">
                      <HabitIcon name={h.name} size={16} />
                    </span>
                    <span className="truncate">{h.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedHabit && (
            <>
              <div className="px-5 pb-3">
                <span className="mb-2 block text-micro text-ink-3">What to change</span>
                <div className="flex flex-wrap gap-2">
                  {(["group", "frequency"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setChangeType(t);
                        setNewValue("");
                      }}
                      className={`min-h-11 rounded-sm px-4 text-label font-medium transition-colors ${
                        changeType === t
                          ? "bg-foreground text-background"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {t === "group" ? "Time of day" : "Frequency"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-5 pb-3">
                <span className="mb-2 block text-micro text-ink-3">
                  {changeType === "group" ? "Move to" : "Change to"}
                </span>
                <div className="flex flex-wrap gap-2">
                  {(changeType === "group"
                    ? GROUP_OPTIONS.filter((o) => o.value !== selectedHabit.group)
                    : FREQUENCY_OPTIONS.filter(
                        (o) => o.value !== selectedHabit.frequency
                      )
                  ).map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setNewValue(o.value)}
                      className={`min-h-11 rounded-sm px-4 text-label font-medium transition-colors ${
                        newValue === o.value
                          ? "bg-foreground text-background"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="pt-3 text-label text-muted-foreground">
                  Currently{" "}
                  <span className="text-foreground">
                    {changeType === "group"
                      ? selectedHabit.group
                      : selectedHabit.frequency}
                  </span>
                  . Two weeks from today, you will see whether the change stuck better.
                </p>
              </div>

              <div className="flex px-5 pt-1">
                <SheetPrimaryButton onClick={handleCreate} disabled={!newValue}>
                  Start 2-week experiment
                </SheetPrimaryButton>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
