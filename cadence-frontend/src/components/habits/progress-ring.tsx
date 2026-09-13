"use client";

import { cn } from "@/lib/utils";

const SIZE = 42;
const STROKE = 3;
const RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({
  completed,
  total,
  minimumMode,
}: {
  completed: number;
  total: number;
  minimumMode?: boolean;
}) {
  if (total <= 0) return null;

  const ratio = Math.min(1, Math.max(0, completed / total));
  const offset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div
      role="img"
      aria-label={`${completed} of ${total} done`}
      className={cn("relative shrink-0 leading-none", minimumMode && "text-amber-400")}
      style={minimumMode ? undefined : { color: "var(--primary)" }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox="0 0 42 42"
        className="block -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="21"
          cy="21"
          r={RADIUS}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={STROKE}
        />
        <circle
          cx="21"
          cy="21"
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-micro font-medium text-foreground">
        {completed}/{total}
      </span>
    </div>
  );
}
