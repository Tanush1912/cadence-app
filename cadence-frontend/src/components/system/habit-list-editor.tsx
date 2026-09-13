"use client";

import { useGun } from "@/lib/gun/gun-provider";
import { SheetAddRow, SheetGroupLabel } from "./settings-row";
import type { Habit } from "@/lib/types";
import { Pencil, Archive, ArchiveRestore } from "lucide-react";
import { HabitIcon } from "@/lib/utils/habit-icons";

interface HabitListEditorProps {
  active: Habit[];
  archived: Habit[];
  loading?: boolean;
  onEdit?: (habit: Habit) => void;
  onAdd?: () => void;
}

export function HabitListEditor({
  active,
  archived,
  loading,
  onEdit,
  onAdd,
}: HabitListEditorProps) {
  const gun = useGun();

  const archiveHabit = (habit: Habit) => {
    if (!gun) return;
    gun.get("habits").get(habit.id).put({ archived: true });
  };

  const unarchiveHabit = (habit: Habit) => {
    if (!gun) return;
    gun.get("habits").get(habit.id).put({ archived: false });
  };

  if (loading) {
    return <div className="mx-5 h-12 animate-pulse rounded-lg bg-secondary" />;
  }

  return (
    <div>
      <SheetAddRow label="Add habit" onClick={() => onAdd?.()} />

      {active.map((habit) => (
        <div
          key={habit.id}
          className="flex min-h-13 items-center gap-3 border-b border-border px-5 last:border-b-0"
        >
          <span className="flex text-muted-foreground">
            <HabitIcon name={habit.name} size={17} />
          </span>
          <span className="min-w-0 flex-1 truncate text-body text-foreground">
            {habit.name}
          </span>
          <span className="shrink-0 rounded-sm bg-secondary px-2 py-0.5 font-mono text-micro text-muted-foreground">
            {habit.frequency}
          </span>
          <button
            type="button"
            aria-label={`Edit ${habit.name}`}
            onClick={() => onEdit?.(habit)}
            className="-mr-1 flex size-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors active:bg-secondary"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label={`Archive ${habit.name}`}
            onClick={() => archiveHabit(habit)}
            className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors active:bg-secondary"
          >
            <Archive className="size-4" />
          </button>
        </div>
      ))}

      {archived.length > 0 && (
        <>
          <SheetGroupLabel>Archived ({archived.length})</SheetGroupLabel>
          {archived.map((habit) => (
            <div
              key={habit.id}
              className="flex min-h-13 items-center gap-3 border-b border-border px-5 last:border-b-0"
            >
              <span className="flex text-ink-3">
                <HabitIcon name={habit.name} size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate text-body text-ink-3">
                {habit.name}
              </span>
              <button
                type="button"
                aria-label={`Restore ${habit.name}`}
                onClick={() => unarchiveHabit(habit)}
                className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors active:bg-secondary"
              >
                <ArchiveRestore className="size-4" />
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
