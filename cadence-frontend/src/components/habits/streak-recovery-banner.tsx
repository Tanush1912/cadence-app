"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StreakRecoveryBannerProps {
  onDismiss: () => void;
  recoveriesUsed: number;
  maxRecoveries: number;
}

export function StreakRecoveryBanner({
  onDismiss,
  recoveriesUsed,
  maxRecoveries,
}: StreakRecoveryBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between gap-3 rounded-sm border border-amber-500/15 bg-amber-500/10 px-3 py-2">
            <p className="min-w-0 truncate text-micro text-amber-400">
              Streak at risk. Hit your goal to recover{" "}
              <span className="font-mono">
                ({recoveriesUsed}/{maxRecoveries} this week)
              </span>
            </p>

            <button
              onClick={handleDismiss}
              className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-amber-400 transition-colors after:absolute after:inset-[-8px] after:content-[''] hover:bg-amber-500/10"
              aria-label="Dismiss streak recovery banner"
            >
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
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
