"use client";

export function StreakBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="text-xs text-terminal-amber whitespace-nowrap">
      {"🔥"}{count}
    </span>
  );
}
