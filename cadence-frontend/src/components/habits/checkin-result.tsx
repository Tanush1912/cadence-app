"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { Habit } from "@/lib/types";

export type HabitDecision = "completed" | "notCompleted" | "uncertain" | "unresolved";

export interface HabitMatch {
  habit: Habit;
  decision: HabitDecision;
}

export function CheckinResult({
  matches,
  onToggle,
  onApply,
}: {
  matches: HabitMatch[];
  onToggle: (habitId: string) => void;
  onApply: () => void;
}) {
  const completed = matches.filter((m) => m.decision === "completed");
  const uncertain = matches.filter((m) => m.decision === "uncertain" || m.decision === "unresolved");
  const notCompleted = matches.filter((m) => m.decision === "notCompleted");
  const unresolvedCount = matches.filter((m) => m.decision === "unresolved").length;

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-1">
          {completed.map((m) => (
            <button
              key={m.habit.id}
              onClick={() => onToggle(m.habit.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/10 text-foreground transition-colors hover:bg-emerald-500/15"
            >
              <span className="text-emerald-400 text-sm font-bold">{"✓"}</span>
              <span className="text-sm">{m.habit.emoji}</span>
              <span className="text-sm flex-1 text-left">{m.habit.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Uncertain — Yes/No buttons */}
      {uncertain.length > 0 && (
        <div className="space-y-1">
          {uncertain.map((m) => (
            <div
              key={m.habit.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1a1a1a]"
            >
              <span className="text-sm text-amber-400">{"?"}</span>
              <span className="text-sm">{m.habit.emoji}</span>
              <span className="text-sm flex-1 truncate">{m.habit.name}</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => onToggle(m.habit.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                    m.decision === "uncertain"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-[#262626] text-muted-foreground hover:text-foreground"
                  )}
                >
                  Yes
                </button>
                <button
                  onClick={() => onToggle(m.habit.id)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                    m.decision === "unresolved"
                      ? "bg-[#262626] text-muted-foreground"
                      : "bg-[#262626] text-muted-foreground hover:text-foreground"
                  )}
                >
                  No
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Not completed */}
      {notCompleted.length > 0 && (
        <div className="space-y-1">
          {notCompleted.map((m) => (
            <button
              key={m.habit.id}
              onClick={() => onToggle(m.habit.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground/50 transition-colors hover:text-muted-foreground hover:bg-[#1a1a1a]"
            >
              <span className="text-sm">{"✗"}</span>
              <span className="text-sm">{m.habit.emoji}</span>
              <span className="text-sm flex-1 text-left">{m.habit.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Apply */}
      <div className="pt-2 space-y-2">
        {unresolvedCount > 0 && (
          <p className="text-[11px] text-muted-foreground/60 text-center">
            {unresolvedCount} habit{unresolvedCount > 1 ? "s" : ""} unresolved, they'll stay as-is
          </p>
        )}
        <button
          onClick={onApply}
          className="w-full py-3 bg-foreground text-background rounded-xl font-semibold text-sm hover:bg-foreground/90 transition-colors"
        >
          Apply check-in
        </button>
      </div>
    </motion.div>
  );
}
