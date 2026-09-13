"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGun } from "@/lib/gun/gun-provider";

const STARTER_HABITS = [
  { emoji: "\u{1F9D8}", name: "Meditate", floor: "2 minutes", group: "morning" },
  { emoji: "\u{1F3CB}", name: "Exercise", floor: "10 minutes", group: "morning" },
  { emoji: "\u{1F4D3}", name: "Journal", floor: "1 sentence", group: "evening" },
  { emoji: "\u{1F4D6}", name: "Read", floor: "10 pages", group: "evening" },
  { emoji: "\u{1F4A4}", name: "Sleep 8 hours", floor: "7 hours", group: "evening" },
  { emoji: "\u{2615}", name: "No caffeine after 2pm", floor: "", group: "anytime", type: "quit" as const },
  { emoji: "\u{1F4AA}", name: "Workout", floor: "15 minutes", group: "anytime" },
  { emoji: "\u{1F6B6}", name: "Walk 10k steps", floor: "5k steps", group: "anytime" },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const gun = useGun();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"welcome" | "pick">("welcome");

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleStart = () => {
    if (!gun) return;
    const selectedHabits = Array.from(selected).map((i) => STARTER_HABITS[i]);
    selectedHabits.forEach((h, idx) => {
      const id = `h_${Date.now()}_${idx}`;
      gun.get("habits").get(id).put({
        name: h.name, emoji: h.emoji, group: h.group, frequency: "daily",
        floor: h.floor || "", order: idx + 1, archived: false, createdAt: Date.now(),
        ...("type" in h && h.type ? { type: h.type } : {}),
      });
    });
    gun.get("profile").put({ username: "user", dailyGoal: 0.7, accent: "green", createdAt: Date.now() });
    gun.get("_meta").get("onboarded").put(true);
    onComplete();
  };

  const handleSkip = () => {
    if (!gun) return;
    gun.get("profile").put({ username: "user", dailyGoal: 0.7, accent: "green", createdAt: Date.now() });
    gun.get("_meta").get("onboarded").put(true);
    onComplete();
  };

  return (
    <div className="flex flex-col h-dvh bg-[#0a0a0a] text-foreground overflow-hidden relative">
      {/* Background glow — depth anchor */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
        }}
      />

      <AnimatePresence mode="wait">
        {step === "welcome" ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col flex-1 relative z-10"
          >
            {/* Hero — top section */}
            <div className="flex-[3] flex flex-col items-center justify-end px-8">
              <motion.h1
                className="text-[44px] font-bold tracking-tight leading-none"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Cadence
              </motion.h1>

              <motion.p
                className="text-[16px] text-white/35 mt-3 tracking-widest uppercase text-[11px] font-medium"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                track &middot; reflect &middot; improve
              </motion.p>
            </div>

            {/* Features — continuous flow, tighter to hero */}
            <div className="flex-[4] flex flex-col px-10 pt-10">
              <div className="space-y-6">
                {[
                  { title: "Track habits", desc: "Tap or swipe. See streaks." },
                  { title: "Voice journal", desc: "Speak. Captured instantly." },
                  { title: "AI insights", desc: "Find patterns. Adjust." },
                ].map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 + i * 0.15, duration: 0.35 }}
                  >
                    <p className="text-[15px] font-semibold text-white tracking-[-0.01em]">{f.title}</p>
                    <p className="text-[13px] text-white/25 mt-0.5">{f.desc}</p>
                  </motion.div>
                ))}
              </div>

              {/* CTA — tight below features */}
              <motion.div
                className="mt-auto pb-14 pt-8"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.5 }}
              >
                <button
                  onClick={() => setStep("pick")}
                  className="w-full py-4 bg-white text-[#0a0a0a] rounded-2xl font-semibold text-[15px] hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                >
                  Get started
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
                <p className="text-[11px] text-white/25 text-center mt-4">
                  No account needed. Data stays on device.
                </p>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="pick"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col flex-1 pt-16 relative z-10"
          >
            <div className="px-8 mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Pick your habits</h2>
              <p className="text-[13px] text-white/35 mt-1.5">
                Choose a few to start. Change anytime.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 space-y-1.5 pb-4">
              {STARTER_HABITS.map((h, i) => {
                const isSelected = selected.has(i);
                return (
                  <motion.button
                    key={i}
                    onClick={() => toggle(i)}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                      isSelected
                        ? "bg-white/[0.07]"
                        : "bg-transparent hover:bg-white/[0.03]"
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.25 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex-1 text-left">
                      <p className="text-[15px] font-medium text-white/90">{h.name}</p>
                      {h.floor && (
                        <p className="text-[12px] text-white/25 mt-0.5">{h.floor}</p>
                      )}
                    </div>
                    <div
                      className={`w-5.5 h-5.5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-white border-white"
                          : "border-white/15"
                      }`}
                      style={{ width: 22, height: 22 }}
                    >
                      {isSelected && (
                        <motion.svg
                          width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke="#0a0a0a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </motion.svg>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="px-8 pt-3 pb-12 space-y-2">
              <button
                onClick={handleStart}
                disabled={selected.size === 0}
                className="w-full py-4 bg-white text-[#0a0a0a] rounded-2xl font-semibold text-[15px] hover:bg-white/90 transition-all disabled:opacity-15 disabled:cursor-not-allowed"
              >
                {selected.size === 0
                  ? "Select habits"
                  : `Continue with ${selected.size}`}
              </button>
              <button
                onClick={handleSkip}
                className="w-full py-3 text-white/50 text-[13px] font-medium hover:text-white/70 transition-colors"
              >
                Skip
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
