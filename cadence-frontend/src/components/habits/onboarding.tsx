"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Ban,
  BookOpen,
  Check,
  Dumbbell,
  Flame,
  Footprints,
  Lightbulb,
  Moon,
  NotebookPen,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { useGun } from "@/lib/gun/gun-provider";
import { HeroField } from "./hero-field";

type Starter = {
  emoji: string;
  name: string;
  floor: string;
  group: string;
  type?: "quit";
  icon: LucideIcon;
  tint: keyof typeof TINT;
};

const TINT = {
  teal: "bg-habit-teal/15 text-habit-teal",
  amber: "bg-habit-amber/15 text-habit-amber",
  purple: "bg-habit-purple/15 text-habit-purple",
  blue: "bg-habit-blue/15 text-habit-blue",
  rose: "bg-habit-rose/15 text-habit-rose",
  green: "bg-habit-green/15 text-habit-green",
  quit: "bg-destructive/15 text-destructive",
};

const STARTER_HABITS: Starter[] = [
  { emoji: "\u{1F9D8}", name: "Meditate", floor: "2 minutes", group: "morning", icon: Lightbulb, tint: "teal" },
  { emoji: "\u{1F3CB}", name: "Exercise", floor: "10 minutes", group: "morning", icon: Dumbbell, tint: "amber" },
  { emoji: "\u{1F4D3}", name: "Journal", floor: "1 sentence", group: "evening", icon: NotebookPen, tint: "purple" },
  { emoji: "\u{1F4D6}", name: "Read", floor: "10 pages", group: "evening", icon: BookOpen, tint: "blue" },
  { emoji: "\u{1F4A4}", name: "Sleep 8 hours", floor: "7 hours", group: "evening", icon: Moon, tint: "rose" },
  { emoji: "\u{2615}", name: "No caffeine after 2pm", floor: "", group: "anytime", type: "quit", icon: Ban, tint: "quit" },
  { emoji: "\u{1F4AA}", name: "Workout", floor: "15 minutes", group: "anytime", icon: Flame, tint: "green" },
  { emoji: "\u{1F6B6}", name: "Walk 10k steps", floor: "5k steps", group: "anytime", icon: Footprints, tint: "teal" },
];

const BUILDING = STARTER_HABITS.map((h, i) => i).filter(
  (i) => STARTER_HABITS[i].type !== "quit"
);
const QUITTING = STARTER_HABITS.map((h, i) => i).filter(
  (i) => STARTER_HABITS[i].type === "quit"
);

function PickRow({
  index,
  picked,
  onToggle,
}: {
  index: number;
  picked: boolean;
  onToggle: (index: number) => void;
}) {
  const habit = STARTER_HABITS[index];
  const Icon = habit.icon;
  const quit = habit.type === "quit";
  return (
    <button
      type="button"
      aria-pressed={picked}
      onClick={() => onToggle(index)}
      className={`mb-2 flex min-h-14 w-full items-center gap-3 rounded-lg border bg-card px-3.5 text-left transition-colors ${
        picked
          ? quit
            ? "border-destructive"
            : "border-foreground"
          : "border-border"
      }`}
    >
      <span
        className={`flex size-8 shrink-0 items-center justify-center rounded-sm ${TINT[habit.tint]}`}
      >
        <Icon className="size-4" strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-foreground">
          {habit.name}
        </span>
        <span className="block text-label text-muted-foreground">
          {quit ? "Clean unless you say otherwise" : habit.floor}
        </span>
      </span>
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
          picked
            ? quit
              ? "border-destructive bg-destructive text-background"
              : "border-foreground bg-foreground text-background"
            : "border-surface-3 text-transparent"
        }`}
      >
        <Check className="size-3" strokeWidth={3.2} />
      </span>
    </button>
  );
}

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const gun = useGun();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState(0);

  const picked = useMemo(
    () =>
      Array.from(selected)
        .sort((a, b) => a - b)
        .map((i) => STARTER_HABITS[i]),
    [selected]
  );

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const finish = (habits: Starter[]) => {
    if (!gun) return;
    habits.forEach((h, idx) => {
      const id = `h_${Date.now()}_${idx}`;
      gun.get("habits").get(id).put({
        name: h.name, emoji: h.emoji, group: h.group, frequency: "daily",
        floor: h.floor || "", order: idx + 1, archived: false, createdAt: Date.now(),
        ...(h.type ? { type: h.type } : {}),
      });
    });
    gun.get("profile").put({ username: "user", dailyGoal: 0.7, accent: "green", createdAt: Date.now() });
    gun.get("_meta").get("onboarded").put(true);
    onComplete();
  };

  const buildingCount = BUILDING.filter((i) => selected.has(i)).length;
  const quittingCount = QUITTING.filter((i) => selected.has(i)).length;

  const advance = () => {
    if (step < 2) setStep(step + 1);
    else finish(picked);
  };

  const panes = [
    <div key="why" className="pt-24">
      <h1
        className="text-balance font-semibold text-foreground"
        style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: "-0.035em" }}
      >
        You will miss days.
      </h1>
      <p className="mt-4 max-w-[26ch] text-pretty text-title text-muted-foreground">
        Cadence is built for that. Every habit gets a{" "}
        <span className="font-medium text-foreground">floor</span>, the smallest
        version that still counts, so a bad day costs you a minute instead of a
        streak.
      </p>
      <HeroField className="-mx-6 mt-4" />
    </div>,

    <div key="pick" className="pb-6">
      <div className="pt-14">
        <h2 className="text-page-title font-semibold tracking-tight text-foreground">
          What are you working on?
        </h2>
        <p className="mt-2 text-label text-muted-foreground">
          Three is plenty. You can change all of this later.
        </p>
      </div>

      <p className="flex items-center gap-2 pt-6 pb-2.5 text-micro text-ink-3">
        Building
        <span className="ml-auto font-mono">{buildingCount}</span>
      </p>
      {BUILDING.map((i) => (
        <PickRow key={i} index={i} picked={selected.has(i)} onToggle={toggle} />
      ))}

      <p className="flex items-center gap-2 pt-6 pb-2.5 text-micro text-ink-3">
        <Shield className="size-3 shrink-0" />
        Quitting
        <span className="ml-auto font-mono">{quittingCount}</span>
      </p>
      {QUITTING.map((i) => (
        <PickRow key={i} index={i} picked={selected.has(i)} onToggle={toggle} />
      ))}
    </div>,

    <div key="floor" className="pb-6">
      <div className="pt-14">
        <h2 className="text-page-title font-semibold tracking-tight text-foreground">
          Your floors
        </h2>
        <p className="mt-2 text-label text-muted-foreground">
          The smallest version that still counts. You can change any of them
          later.
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-card p-4">
        {picked.map((h, i) => (
          <div
            key={h.name}
            className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-border" : ""}`}
          >
            <span className="min-w-0 flex-1 text-body text-foreground">
              {h.name}
            </span>
            <span
              className={`shrink-0 rounded-sm bg-secondary px-2.5 py-1 font-mono text-label ${
                h.type === "quit" ? "text-ink-3" : "text-foreground"
              }`}
            >
              {h.type === "quit" ? "no floor" : h.floor}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-balance text-title tracking-tight text-foreground">
        On your worst day,{" "}
        <span className="text-muted-foreground">this is all you owe.</span>
      </p>
      <p className="mt-3.5 text-label text-muted-foreground">
        Turn on minimum mode and Cadence shows only these. A quit habit has no
        floor, because not doing something has no smaller version.
      </p>
    </div>,
  ];

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-background text-foreground"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            // px-6 lives here, not on the scroll parent: the hero's -mx-6 bleed
            // would otherwise be clipped at the scroll container's padding box.
            className="no-scrollbar absolute inset-0 overflow-y-auto px-6 pb-4"
          >
            {panes[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Foot is outside the animated pane so the button never moves between steps. */}
      <div className="shrink-0 px-6 pt-6">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i <= step ? "bg-muted-foreground" : "bg-surface-3"}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={advance}
          disabled={step === 1 && selected.size === 0}
          className="mt-3.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-foreground text-body font-semibold text-background transition-opacity disabled:opacity-30"
        >
          {step === 0 && (
            <>
              Start
              <ArrowRight className="size-4" strokeWidth={2.5} />
            </>
          )}
          {step === 1 &&
            (selected.size === 0 ? "Continue" : `Continue with ${selected.size}`)}
          {step === 2 && "Done"}
        </button>

        {/* Reserved on every screen, empty or not: the caption must not shift the button. */}
        <div className="flex h-11 items-center justify-center">
          {step === 0 && (
            <p className="text-label text-ink-3">
              No account. Nothing leaves this device.
            </p>
          )}
          {step === 1 && (
            <button
              type="button"
              onClick={() => finish([])}
              className="flex h-11 items-center px-4 text-label text-ink-3"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
