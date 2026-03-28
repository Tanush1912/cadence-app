"use client";

import { useMemo } from "react";
import { useGunMap } from "@/lib/hooks/use-gun-node";
import { useGun } from "@/lib/gun/gun-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import type { Habit } from "@/lib/types";
import { Pencil, Archive, ArchiveRestore, ChevronDown, Plus } from "lucide-react";
import { HabitIcon } from "@/lib/utils/habit-icons";

interface HabitListEditorProps {
  onEdit?: (habit: Habit) => void;
  onAdd?: () => void;
}

export function HabitListEditor({ onEdit, onAdd }: HabitListEditorProps) {
  const gun = useGun();
  const { data: rawHabits, loading } = useGunMap<Record<string, unknown>>("habits");

  const { active, archived } = useMemo(() => {
    const all = Object.entries(rawHabits).map(
      ([id, raw]) => ({ ...raw, id } as unknown as Habit)
    );
    return {
      active: all.filter((h) => !h.archived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      archived: all.filter((h) => h.archived).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    };
  }, [rawHabits]);

  const archiveHabit = (habit: Habit) => {
    if (!gun) return;
    gun.get("habits").get(habit.id).put({ archived: true });
  };

  const unarchiveHabit = (habit: Habit) => {
    if (!gun) return;
    gun.get("habits").get(habit.id).put({ archived: false });
  };

  if (loading) {
    return <div className="h-12 animate-pulse rounded-xl bg-[#1a1a1a]" />;
  }

  return (
    <div className="space-y-3">
      {/* Compact active habits list */}
      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <span>{active.length} active habit{active.length !== 1 ? "s" : ""}</span>
          <ChevronDown className="size-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-0.5">
          {active.map((habit) => (
            <div
              key={habit.id}
              className="group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-[#1a1a1a]"
            >
              <span className="text-muted-foreground"><HabitIcon name={habit.name} size={15} /></span>
              <span className="flex-1 truncate text-sm text-[#fafafa]">{habit.name}</span>
              <Badge variant="secondary" className="text-[10px] text-muted-foreground">{habit.frequency}</Badge>
              <button
                onClick={() => onEdit?.(habit)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1"
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={() => archiveHabit(habit)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all p-1"
              >
                <Archive className="size-3" />
              </button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed border-[#262626] text-xs"
        onClick={() => onAdd?.()}
      >
        <Plus className="size-3.5" />
        Add habit
      </Button>

      {/* Archived */}
      {archived.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center gap-2 px-1 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground">
            <ChevronDown className="size-3" />
            Archived ({archived.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-0.5">
            {archived.map((habit) => (
              <div
                key={habit.id}
                className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-[#1a1a1a]"
              >
                <span className="text-muted-foreground/40 ml-4"><HabitIcon name={habit.name} size={14} /></span>
                <span className="flex-1 truncate text-sm text-muted-foreground">{habit.name}</span>
                <button
                  onClick={() => unarchiveHabit(habit)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1"
                >
                  <ArchiveRestore className="size-3" />
                </button>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
