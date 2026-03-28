"use client";

import { cn } from "@/lib/utils";
import type { Mood } from "@/lib/types";

const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: "great", emoji: "\u{1F60A}", label: "Great" },
  { value: "good", emoji: "\u{1F642}", label: "Good" },
  { value: "okay", emoji: "\u{1F610}", label: "Okay" },
  { value: "rough", emoji: "\u{1F614}", label: "Rough" },
  { value: "bad", emoji: "\u{1F61E}", label: "Bad" },
];

export function MoodPicker({
  selected,
  onSelect,
}: {
  selected: Mood;
  onSelect: (mood: Mood) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {MOODS.map((m) => (
        <button
          key={m.value}
          onClick={() => onSelect(selected === m.value ? null : m.value)}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all",
            selected === m.value
              ? "bg-foreground/10 ring-1 ring-foreground/20 scale-110"
              : "opacity-50 hover:opacity-80"
          )}
          title={m.label}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  );
}
