"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { cn } from "@/lib/utils";
import { MiniHeatmap } from "./mini-heatmap";
import { FrictionDots } from "./friction-dots";
import { HabitIcon } from "@/lib/utils/habit-icons";
import { useFriction } from "@/lib/hooks/use-friction";
import { isEditable } from "@/lib/utils/dates";
import type { Habit, Log, Streak, FrictionScore } from "@/lib/types";

const ACCENT_COLORS: Record<string, string> = {
  morning: "teal",
  evening: "amber",
  anytime: "rose",
};

const COLOR_MAP: Record<string, string> = {
  teal: "#2dd4bf",
  amber: "#f59e0b",
  rose: "#fb7185",
  green: "#4ade80",
  purple: "#a78bfa",
  blue: "#60a5fa",
  white: "#e4e4e7",
  orange: "#fb923c",
};

const GROUP_FALLBACK_COLOR: Record<string, string> = {
  morning: "teal",
  evening: "amber",
  anytime: "rose",
};

const SWIPE_THRESHOLD = 80;

export function HabitCard({
  habit,
  log,
  streak,
  dateKey,
  heatmapData,
  onToggle,
  onFriction,
  onEdit,
  onArchive,
  onSkip,
  minimumMode,
  nudge,
}: {
  habit: Habit;
  log: Log | undefined;
  streak: Streak | undefined;
  dateKey: string;
  heatmapData: boolean[];
  onToggle: (habitId: string) => boolean | undefined;
  onFriction: (habitId: string, score: FrictionScore) => void;
  onEdit?: (habit: Habit) => void;
  onArchive?: (habit: Habit) => void;
  onSkip?: (habit: Habit) => void;
  minimumMode?: boolean;
  nudge?: import("@/lib/hooks/use-coaching-nudges").CoachingNudge | null;
}) {
  const done = log?.done ?? false;
  const skipped = log?.skipped ?? false;
  const editable = isEditable(dateKey);
  const habitColor = habit.color || GROUP_FALLBACK_COLOR[habit.group] || "teal";
  const accent = habitColor;
  const hexColor = COLOR_MAP[habitColor] || COLOR_MAP.teal;
  const [showActions, setShowActions] = useState(false);

  const handleFrictionCommit = useCallback(
    (score: FrictionScore) => onFriction(habit.id, score),
    [habit.id, onFriction]
  );

  const friction = useFriction(handleFrictionCommit);

  const handleToggle = useCallback(() => {
    if (!editable) return;
    const nowDone = onToggle(habit.id);
    if (nowDone) friction.show();
    else friction.reset();
  }, [editable, onToggle, habit.id, friction]);

  const x = useMotionValue(0);
  const dragRef = useRef<HTMLDivElement>(null);

  const bgOpacity = useTransform(x, [-120, -60, 0, 60, 120], [1, 0.8, 0, 0.8, 1]);
  const checkScale = useTransform(x, [0, 60, 120], [0.5, 0.8, 1]);
  const actionScale = useTransform(x, [-120, -60, 0], [1, 0.8, 0.5]);

  const bind = useDrag(
    ({ active, movement: [mx], cancel }) => {
      if (!editable && mx > 0) {
        cancel();
        return;
      }

      if (active) {
        x.set(mx);
      } else {
        if (mx > SWIPE_THRESHOLD && editable) {
          handleToggle();
          if (navigator.vibrate) navigator.vibrate(10);
        }
        if (mx < -SWIPE_THRESHOLD) {
          setShowActions(true);
          animate(x, -180, { type: "spring", stiffness: 300, damping: 30 });
          return;
        }
        animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      }
    },
    {
      axis: "x",
      from: () => [x.get(), 0],
      bounds: { left: -200, right: 140 },
      rubberband: true,
    }
  );

  const dismissActions = () => {
    setShowActions(false);
    animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe right background — complete */}
      <motion.div
        className="absolute inset-0 flex items-center pl-5 rounded-2xl bg-[var(--primary)]/20"
        style={{ opacity: useTransform(x, [0, 60], [0, 1]) }}
      >
        <motion.div style={{ scale: checkScale }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
      </motion.div>

      {/* Swipe left background — actions */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end gap-2 pr-3 rounded-2xl"
        style={{ opacity: useTransform(x, [-60, 0], [1, 0]) }}
      >
        <motion.button
          onClick={() => { onEdit?.(habit); dismissActions(); }}
          className="w-10 h-10 rounded-xl bg-[#262626] flex items-center justify-center text-muted-foreground hover:text-foreground"
          style={{ scale: actionScale }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </motion.button>
        <motion.button
          onClick={() => { onSkip?.(habit); dismissActions(); }}
          className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/25"
          style={{ scale: actionScale }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" x2="19" y1="5" y2="19" />
          </svg>
        </motion.button>
        <motion.button
          onClick={() => { onArchive?.(habit); dismissActions(); }}
          className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400 hover:bg-red-500/25"
          style={{ scale: actionScale }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 8-2 13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L3 8" /><path d="M1 8h22" /><path d="M10 12v6" /><path d="M14 12v6" /><path d="m15 4-1-2H10L9 4" />
          </svg>
        </motion.button>
      </motion.div>

      {/* Main card — draggable */}
      <motion.div
        {...(bind() as unknown as Record<string, unknown>)}
        ref={dragRef}
        style={{ x, touchAction: "pan-y" }}
        className={cn(
          "relative bg-[#141414] rounded-2xl border border-[#262626] overflow-hidden cursor-grab active:cursor-grabbing",
          skipped && !done && "opacity-60"
        )}
      >
        {/* Top section */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${hexColor}15`, color: hexColor }}
          >
            <HabitIcon name={habit.name} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            {minimumMode ? (
              <>
                <h3 className="text-[15px] font-semibold truncate text-amber-300/90">{habit.floor}</h3>
                <p className="text-xs text-muted-foreground/60 truncate">{habit.name}</p>
              </>
            ) : (
              <>
                <h3 className="text-[15px] font-semibold truncate">{habit.name}</h3>
                {nudge ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {(nudge.type === "personal-best" || nudge.type === "consistent") ? (
                      <span className="text-[11px] font-medium" style={{ color: "var(--primary)" }}>
                        {nudge.message}
                      </span>
                    ) : nudge.type === "dropped" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted-foreground/50">{nudge.message}</span>
                        {nudge.actions?.map((a) => (
                          <button
                            key={a.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (a.type === "archive") onArchive?.(habit);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span
                        className="text-[11px] text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors"
                        onClick={(e) => { e.stopPropagation(); onEdit?.(habit); }}
                      >
                        {nudge.message}
                      </span>
                    )}
                  </div>
                ) : habit.floor ? (
                  <p className="text-xs text-muted-foreground truncate">{habit.floor}</p>
                ) : null}
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <FrictionDots
              visible={friction.state === "showing"}
              onSelect={friction.commit}
            />
            {streak && streak.current > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                {streak.current}d
              </span>
            )}
            {skipped && !done ? (
              <span className="text-xs text-muted-foreground/60 font-medium px-2">
                skipped
              </span>
            ) : (
              <motion.button
                onClick={(e) => { e.stopPropagation(); handleToggle(); }}
                disabled={!editable}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  done
                    ? "text-[#0a0a0a]"
                    : "bg-[#262626] text-muted-foreground hover:text-foreground",
                  !editable && "opacity-40 cursor-not-allowed"
                )}
                style={done ? { backgroundColor: "var(--primary)" } : undefined}
                whileTap={editable ? { scale: 0.92 } : undefined}
              >
                <svg
                  width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={done ? "3" : "2"}
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>

        {/* Mini heatmap — hidden in minimum mode for simplicity */}
        {!minimumMode && (
          <div className="px-4 pb-4 pt-1">
            <MiniHeatmap data={heatmapData} accentColor={accent} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
