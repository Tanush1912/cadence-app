"use client";

import { useCallback, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useAnimationControls } from "framer-motion";
import { useDrag } from "@use-gesture/react";
import { cn } from "@/lib/utils";
import { MiniHeatmap } from "./mini-heatmap";
import { FrictionDots } from "./friction-dots";
import { HabitIcon } from "@/lib/utils/habit-icons";
import { useFriction } from "@/lib/hooks/use-friction";
import { isEditable } from "@/lib/utils/dates";
import { haptic } from "@/lib/utils/haptics";
import type { Habit, Log, Streak, FrictionScore } from "@/lib/types";

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
  onCalendar,
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
  onCalendar?: (habit: Habit) => void;
  minimumMode?: boolean;
  nudge?: import("@/lib/hooks/use-coaching-nudges").CoachingNudge | null;
}) {
  const done = log?.done ?? false;
  const skipped = log?.skipped ?? false;
  const editable = isEditable(dateKey);
  const habitColor = habit.color || GROUP_FALLBACK_COLOR[habit.group] || "teal";
  const hexColor = COLOR_MAP[habitColor] || COLOR_MAP.teal;
  const [, setShowActions] = useState(false);
  const checkControls = useAnimationControls();

  const handleFrictionCommit = useCallback(
    (score: FrictionScore) => onFriction(habit.id, score),
    [habit.id, onFriction]
  );

  const friction = useFriction(handleFrictionCommit);

  const handleToggle = useCallback(() => {
    if (!editable) return;
    const nowDone = onToggle(habit.id);
    if (nowDone) {
      friction.show();
      haptic("success");
      checkControls.start({
        scale: [1, 0.85, 1.15, 1],
        transition: { duration: 0.35, ease: "easeOut" },
      });
    } else {
      haptic("light");
      friction.reset();
    }
  }, [editable, onToggle, habit.id, friction, checkControls]);

  const x = useMotionValue(0);
  const dragRef = useRef<HTMLDivElement>(null);

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
          haptic("success");
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

  const streakLabel = streak && streak.current > 0 ? `${streak.current}d` : null;

  const checkControl = skipped && !done ? (
    <span className="px-2 text-label font-medium text-muted-foreground">skipped</span>
  ) : (
    <motion.button
      onClick={(e) => { e.stopPropagation(); handleToggle(); }}
      disabled={!editable}
      aria-label={done ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
        done
          ? "text-primary-foreground"
          : "border-surface-3 bg-transparent text-ink-3 hover:text-foreground",
        !editable && "cursor-not-allowed opacity-40"
      )}
      style={done ? { backgroundColor: "var(--primary)", borderColor: "var(--primary)" } : undefined}
      animate={checkControls}
      whileTap={editable ? { scale: 0.92 } : undefined}
    >
      <svg
        width="19" height="19" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={done ? "2.6" : "2"}
        strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </motion.button>
  );

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe right background — complete */}
      <motion.div
        className="absolute inset-0 flex items-center rounded-lg bg-[var(--primary)]/20 pl-5"
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
        className="absolute inset-0 flex items-center justify-end gap-2 rounded-lg pr-3"
        style={{ opacity: useTransform(x, [-60, 0], [1, 0]) }}
      >
        <motion.button
          onClick={() => { onEdit?.(habit); dismissActions(); }}
          aria-label="Edit habit"
          className="flex h-11 w-11 items-center justify-center rounded-sm bg-surface-3 text-muted-foreground hover:text-foreground"
          style={{ scale: actionScale }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
        </motion.button>
        <motion.button
          onClick={() => { onSkip?.(habit); dismissActions(); }}
          aria-label="Skip habit"
          className="flex h-11 w-11 items-center justify-center rounded-sm bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
          style={{ scale: actionScale }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" /><line x1="19" x2="19" y1="5" y2="19" />
          </svg>
        </motion.button>
        <motion.button
          onClick={() => { onArchive?.(habit); dismissActions(); }}
          aria-label="Archive habit"
          className="flex h-11 w-11 items-center justify-center rounded-sm bg-destructive/15 text-destructive hover:bg-destructive/25"
          style={{ scale: actionScale }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          "relative cursor-grab overflow-hidden rounded-lg border border-border bg-card transition-opacity duration-300 active:cursor-grabbing",
          skipped && !done && "opacity-60",
          done && !skipped && "opacity-[0.55]"
        )}
      >
        {minimumMode ? (
          <div className="flex items-center gap-3 py-3 pr-3 pl-3.5">
            <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-sm bg-secondary text-muted-foreground">
              <HabitIcon name={habit.name} size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-title font-semibold tracking-tight text-amber-400">
                {habit.floor || habit.name}
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-label">
                <span className="truncate text-muted-foreground">{habit.name}</span>
                {streakLabel && (
                  <>
                    <span className="text-ink-3">&middot;</span>
                    <span className="shrink-0 font-mono text-muted-foreground">{streakLabel}</span>
                  </>
                )}
                {nudge && (
                  <>
                    <span className="text-ink-3">&middot;</span>
                    <span className="truncate text-amber-400">{nudge.message}</span>
                  </>
                )}
              </div>
              <div
                className="-my-2 cursor-pointer py-2"
                onClick={(e) => { e.stopPropagation(); onCalendar?.(habit); }}
              >
                <MiniHeatmap data={heatmapData} variant="compact" />
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <FrictionDots
                visible={friction.state === "showing"}
                onSelect={friction.commit}
              />
              {checkControl}
            </div>
          </div>
        ) : (
          <>
            {/* Top section */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm"
                style={{ backgroundColor: `${hexColor}15`, color: hexColor }}
              >
                <HabitIcon name={habit.name} size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-title font-semibold tracking-tight">{habit.name}</h3>
                {nudge ? (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {(nudge.type === "personal-best" || nudge.type === "consistent") ? (
                      <span className="text-label font-medium" style={{ color: "var(--primary)" }}>
                        {nudge.message}
                      </span>
                    ) : nudge.type === "dropped" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-label text-muted-foreground">{nudge.message}</span>
                        {nudge.actions?.map((a) => (
                          <button
                            key={a.label}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (a.type === "archive") onArchive?.(habit);
                            }}
                            className="rounded-sm bg-secondary px-1.5 py-0.5 text-micro text-muted-foreground transition-colors hover:text-foreground"
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer text-label text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); onEdit?.(habit); }}
                      >
                        {nudge.message}
                      </span>
                    )}
                  </div>
                ) : habit.floor ? (
                  <p className="truncate text-label text-muted-foreground">{habit.floor}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <FrictionDots
                  visible={friction.state === "showing"}
                  onSelect={friction.commit}
                />
                {streakLabel && (
                  <span className="font-mono text-label text-muted-foreground">
                    {streakLabel}
                  </span>
                )}
                {checkControl}
              </div>
            </div>

            <div
              className="cursor-pointer px-4 pt-0.5 pb-3"
              onClick={(e) => { e.stopPropagation(); onCalendar?.(habit); }}
            >
              <MiniHeatmap data={heatmapData} />
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
