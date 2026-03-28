"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SettingsCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ title, children, className }: SettingsCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[#262626] bg-[#141414] p-4",
        className
      )}
    >
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}
