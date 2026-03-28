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
          <div className="bg-amber-500/10 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0" aria-hidden="true">
                &#128293;
              </span>
              <p className="text-sm text-amber-400 font-medium truncate">
                Streak at risk — hit your goal to recover{" "}
                <span className="text-amber-400/70 font-normal">
                  ({recoveriesUsed}/{maxRecoveries} this week)
                </span>
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
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
