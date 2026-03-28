"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { HabitCheckbox } from "./habit-checkbox";
import { StreakBadge } from "./streak-badge";
import { FrictionDots } from "./friction-dots";
import { TerminalComment } from "@/components/shared/terminal-text";
import { useFriction } from "@/lib/hooks/use-friction";
import { isEditable } from "@/lib/utils/dates";
import type { Habit, Log, Streak, FrictionScore } from "@/lib/types";

export function HabitRow({
  habit,
  log,
  streak,
  dateKey,
  onToggle,
  onFriction,
}: {
  habit: Habit;
  log: Log | undefined;
  streak: Streak | undefined;
  dateKey: string;
  onToggle: (habitId: string) => boolean | undefined;
  onFriction: (habitId: string, score: FrictionScore) => void;
}) {
  const done = log?.done ?? false;
  const editable = isEditable(dateKey);

  const handleFrictionCommit = useCallback(
    (score: FrictionScore) => {
      onFriction(habit.id, score);
    },
    [habit.id, onFriction]
  );

  const friction = useFriction(handleFrictionCommit);

  const handleToggle = useCallback(() => {
    if (!editable) return;
    const nowDone = onToggle(habit.id);
    if (nowDone) {
      friction.show();
    } else {
      friction.reset();
    }
  }, [editable, onToggle, habit.id, friction]);

  return (
    <div className="space-y-0.5">
      <div
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handleToggle();
        }}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-2 text-left transition-colors rounded-sm cursor-pointer select-none",
          editable && "active:bg-terminal-card/80",
          !editable && "opacity-60 cursor-not-allowed pointer-events-none",
          done && "opacity-90"
        )}
      >
        <HabitCheckbox checked={done} disabled={!editable} />
        <span className="text-sm">{habit.emoji}</span>
        <span
          className={cn(
            "text-sm flex-1 truncate",
            done ? "text-terminal-green" : "text-foreground"
          )}
        >
          {habit.name}
        </span>
        <div className="flex items-center gap-2">
          <FrictionDots
            visible={friction.state === "showing"}
            onSelect={friction.commit}
          />
          <StreakBadge count={streak?.current ?? 0} />
        </div>
      </div>
      {habit.floor && (
        <div className="pl-[4.5rem]">
          <TerminalComment className="text-[10px]">{habit.floor}</TerminalComment>
        </div>
      )}
    </div>
  );
}
