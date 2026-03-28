"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGun } from "@/lib/gun/gun-provider";
import { generateId } from "@/lib/gun/gun-utils";
import type { Habit, GroupName } from "@/lib/types";

const GROUPS: { id: GroupName; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "evening", label: "Evening" },
  { id: "anytime", label: "Anytime" },
];

const FREQUENCIES = [
  { id: "daily", label: "Daily" },
  { id: "weekdays", label: "Weekdays" },
  { id: "weekly:3", label: "3x / week" },
  { id: "days:mon,wed,fri", label: "Mon, Wed, Fri" },
  { id: "days:tue,thu,sat", label: "Tue, Thu, Sat" },
];

const HABIT_COLORS = [
  { id: "teal", color: "#2dd4bf" },
  { id: "amber", color: "#f59e0b" },
  { id: "rose", color: "#fb7185" },
  { id: "green", color: "#4ade80" },
  { id: "purple", color: "#a78bfa" },
  { id: "blue", color: "#60a5fa" },
  { id: "white", color: "#e4e4e7" },
  { id: "orange", color: "#fb923c" },
];

interface HabitDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingHabit?: Habit | null;
  onSaved?: () => void;
}

export function HabitDrawer({ open, onOpenChange, editingHabit, onSaved }: HabitDrawerProps) {
  const gun = useGun();
  const isEditing = !!editingHabit;

  const [name, setName] = useState("");
  const [group, setGroup] = useState<GroupName>("morning");
  const [frequency, setFrequency] = useState("daily");
  const [floor, setFloor] = useState("");
  const [color, setColor] = useState("teal");

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setGroup(editingHabit.group);
      setFrequency(editingHabit.frequency);
      setFloor(editingHabit.floor || "");
      setColor(editingHabit.color || "teal");
    } else {
      setName("");
      setGroup("morning");
      setFrequency("daily");
      setFloor("");
      setColor("teal");
    }
  }, [editingHabit, open]);

  const handleSave = () => {
    if (!gun || !name.trim()) return;

    const id = editingHabit?.id || generateId();
    gun.get("habits").get(id).put({
      name: name.trim(),
      emoji: "",
      group,
      frequency,
      floor: floor.trim() || "",
      color,
      order: editingHabit?.order ?? Date.now(),
      archived: false,
      createdAt: editingHabit?.createdAt ?? Date.now(),
    });

    onOpenChange(false);
    onSaved?.();
  };

  const handleArchive = () => {
    if (!gun || !editingHabit) return;
    gun.get("habits").get(editingHabit.id).put({ archived: true });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#141414] border-[#262626] max-h-[85svh]">
        <div className="mx-auto w-full max-w-md overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">
              {isEditing ? "Edit Habit" : "New Habit"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 space-y-5">
            {/* Name */}
            <div>
              <Label htmlFor="habit-name" className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Name
              </Label>
              <Input
                id="habit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Meditate"
                className="bg-[#1a1a1a] border-[#262626] text-foreground h-11"
              />
            </div>

            {/* Floor (minimum version) */}
            <div>
              <Label htmlFor="habit-floor" className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Minimum version (optional)
              </Label>
              <Input
                id="habit-floor"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 2 minutes, 1 sentence"
                className="bg-[#1a1a1a] border-[#262626] text-foreground h-11"
              />
            </div>

            {/* Color */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Color
              </Label>
              <div className="flex gap-2.5">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-transform",
                      color === c.id && "scale-110"
                    )}
                    style={{
                      backgroundColor: c.color,
                      ...(color === c.id ? { boxShadow: `0 0 0 2px #141414, 0 0 0 4px ${c.color}` } : {}),
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Group */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Time of day
              </Label>
              <div className="flex gap-2">
                {GROUPS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGroup(g.id)}
                    className={cn(
                      "flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all",
                      group === g.id
                        ? "bg-foreground text-background"
                        : "bg-[#1a1a1a] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Frequency
              </Label>
              <div className="flex flex-wrap gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrequency(f.id)}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                      frequency === f.id
                        ? "bg-foreground text-background"
                        : "bg-[#1a1a1a] text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="mt-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
            <Button
              onClick={handleSave}
              disabled={!name.trim()}
              className="w-full h-12 rounded-xl bg-foreground text-background font-semibold hover:bg-foreground/90"
            >
              {isEditing ? "Save Changes" : "Add Habit"}
            </Button>
            {isEditing && (
              <Button
                onClick={handleArchive}
                variant="ghost"
                className="w-full h-12 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-400"
              >
                Archive Habit
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" className="w-full h-10 rounded-xl text-muted-foreground">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
