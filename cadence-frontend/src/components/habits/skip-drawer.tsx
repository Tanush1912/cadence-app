"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGun } from "@/lib/gun/gun-provider";
import { useSharedData } from "@/lib/gun/data-provider";
import { HabitIcon } from "@/lib/utils/habit-icons";
import type { Habit } from "@/lib/types";

const QUICK_REASONS = ["Tired", "Busy", "Sick", "Rest day", "Not relevant"];

export function SkipDrawer({
  open,
  habit,
  dateKey,
  onOpenChange,
}: {
  open: boolean;
  habit: Habit | null;
  dateKey: string;
  onOpenChange: (open: boolean) => void;
}) {
  const gun = useGun();
  const { updateLog } = useSharedData();
  const [reason, setReason] = useState("");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);

  const handleChipToggle = useCallback((chip: string) => {
    setSelectedChip((prev) => {
      if (prev === chip) {
        setReason("");
        return null;
      }
      setReason(chip);
      return chip;
    });
  }, []);

  const handleSkip = useCallback(() => {
    if (!gun || !habit) return;

    const logData = {
      done: false,
      skipped: true,
      skipReason: reason || "",
      friction: null,
      retroactive: false,
      completedAt: null,
    };

    gun.get("logs").get(dateKey).get(habit.id).put(logData);
    updateLog(dateKey, habit.id, logData);

    setReason("");
    setSelectedChip(null);
    onOpenChange(false);
  }, [gun, habit, dateKey, reason, updateLog, onOpenChange]);

  const handleClose = useCallback(() => {
    setReason("");
    setSelectedChip(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <AnimatePresence>
      {open && habit && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414] border-t border-[#262626] rounded-t-2xl px-5 pb-8 pt-4"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-[#262626]" />
            </div>

            {/* Habit info */}
            <div className="flex items-center gap-3 mb-5">
              <div className="text-muted-foreground">
                <HabitIcon name={habit.name} size={20} />
              </div>
              <h3 className="text-base font-semibold">Skip {habit.name}</h3>
            </div>

            {/* Reason input */}
            <input
              type="text"
              placeholder="Why are you skipping? (optional)"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setSelectedChip(null);
              }}
              className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#363636] mb-4"
            />

            {/* Quick reason chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              {QUICK_REASONS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChipToggle(chip)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    selectedChip === chip
                      ? "bg-[var(--primary)]/20 text-[var(--primary)] border border-[var(--primary)]/30"
                      : "bg-[#1a1a1a] text-muted-foreground border border-[#262626] hover:border-[#363636]"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "var(--primary)",
                color: "#0a0a0a",
              }}
            >
              Skip
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
