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
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          aria-pressed={selected === cat.id}
          className={cn(
            // 44px hit area over a ~30px pill, without growing the visual.
            "relative shrink-0 rounded-full px-3.5 py-1.5 text-label font-medium whitespace-nowrap transition-all",
            "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
            selected === cat.id
              ? "text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
          style={selected === cat.id ? { backgroundColor: "var(--primary)" } : undefined}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
