"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { GROUP_LABELS } from "@/lib/constants";
import { TerminalComment } from "@/components/shared/terminal-text";
import type { GroupName, Habit, Log, Streak, FrictionScore } from "@/lib/types";
import { HabitRow } from "./habit-row";

export function HabitGroup({
  group,
  habits,
  logs,
  streaks,
  dateKey,
  onToggle,
  onFriction,
}: {
  group: GroupName;
  habits: Habit[];
  logs: Record<string, Log>;
  streaks: Record<string, Streak>;
  dateKey: string;
  onToggle: (habitId: string) => boolean | undefined;
  onFriction: (habitId: string, score: FrictionScore) => void;
}) {
  if (habits.length === 0) return null;

  const label = GROUP_LABELS[group];
  const completed = habits.filter((h) => logs[h.id]?.done).length;

  return (
    <Collapsible defaultOpen className="py-1">
      <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-terminal-card/30 transition-colors rounded-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm">{label.emoji}</span>
          <span className="text-sm font-medium text-terminal-green">
            {label.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-terminal-muted">
            [{completed}/{habits.length}]
          </span>
        </div>
      </CollapsibleTrigger>
      <div className="pl-2">
        <TerminalComment className="text-[10px] ml-4">
          {label.description.replace("// ", "")}
        </TerminalComment>
      </div>
      <CollapsibleContent>
        <div className="mt-1">
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              log={logs[habit.id]}
              streak={streaks[habit.id]}
              dateKey={dateKey}
              onToggle={onToggle}
              onFriction={onFriction}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
