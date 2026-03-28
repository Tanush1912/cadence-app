"use client";

import { cn } from "@/lib/utils";
import type { GroupName } from "@/lib/types";

const CATEGORIES: { id: GroupName | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "morning", label: "Morning" },
  { id: "evening", label: "Evening" },
  { id: "anytime", label: "Anytime" },
];

export function CategoryFilter({
  selected,
  onSelect,
}: {
  selected: GroupName | "all";
  onSelect: (category: GroupName | "all") => void;
}) {
  return (
    <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
            selected === cat.id
              ? "text-[#0a0a0a]"
              : "bg-[#1a1a1a] text-muted-foreground hover:text-foreground"
          )}
          style={selected === cat.id ? { backgroundColor: "var(--primary)" } : undefined}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
