"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function OverviewCard({
  icon,
  label,
  value,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-[#141414] rounded-2xl border border-[#262626] px-4 py-4 flex flex-col gap-2",
        className
      )}
    >
      <div className="flex items-center gap-2 text-[#737373]">
        <span className="w-4 h-4 shrink-0">{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-semibold font-mono text-[#fafafa] leading-none">
        {value}
      </p>
    </div>
  );
}
