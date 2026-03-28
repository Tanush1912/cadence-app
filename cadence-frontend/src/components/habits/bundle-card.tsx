"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useGun } from "@/lib/gun/gun-provider";
import { todayKey } from "@/lib/utils/dates";

interface BundleCardProps {
  bundleName: string;
  habitIds: string[];
  habitNames: Record<string, string>;
  completedHabitIds: Set<string>;
  onComplete: () => void;
}

export function BundleCard({
  bundleName,
  habitIds,
  habitNames,
  completedHabitIds,
  onComplete,
}: BundleCardProps) {
  const gun = useGun();
  const [completing, setCompleting] = useState(false);

  const totalCount = habitIds.length;
  const doneCount = habitIds.filter((id) => completedHabitIds.has(id)).length;
  const allDone = doneCount === totalCount;

  const handleCompleteAll = useCallback(() => {
    if (!gun || allDone || completing) return;

    setCompleting(true);
    const dateKey = todayKey();

    for (const habitId of habitIds) {
      if (completedHabitIds.has(habitId)) continue;

      gun.get("logs").get(dateKey).get(habitId).put({
        done: true,
        friction: 1,
        retroactive: false,
        completedAt: Date.now(),
      });
    }

    onComplete();

    setTimeout(() => setCompleting(false), 600);
  }, [gun, habitIds, completedHabitIds, allDone, completing, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a1a1a] rounded-2xl border border-dashed border-[#333] px-4 py-3.5 flex items-center justify-between gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">&#9728;&#65039;</span>
          <h3 className="text-[15px] font-semibold truncate">{bundleName}</h3>
          <span className="text-xs text-muted-foreground shrink-0">
            ({doneCount}/{totalCount} habits)
          </span>
        </div>
        {totalCount <= 5 && (
          <p className="text-xs text-muted-foreground mt-1 truncate pl-7">
            {habitIds
              .map((id) => habitNames[id] || id)
              .join(", ")}
          </p>
        )}
      </div>

      <motion.button
        onClick={handleCompleteAll}
        disabled={allDone || completing}
        whileTap={!allDone ? { scale: 0.95 } : undefined}
        className={
          allDone
            ? "shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium bg-emerald-500/15 text-emerald-400 cursor-default"
            : "shrink-0 px-3.5 py-2 rounded-xl text-sm font-medium bg-[#262626] text-foreground hover:bg-[#303030] transition-colors"
        }
      >
        {allDone ? (
          <span className="flex items-center gap-1.5">
            Done
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        ) : completing ? (
          <span className="flex items-center gap-1.5">
            Completing...
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            Complete all
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}
