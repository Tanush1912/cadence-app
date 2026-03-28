"use client";

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const DOT_CONFIG = [
  { score: 1 as const, color: "bg-terminal-green", label: "easy" },
  { score: 2 as const, color: "bg-terminal-amber", label: "moderate" },
  { score: 3 as const, color: "bg-terminal-red", label: "hard" },
];

export function FrictionDots({
  visible,
  onSelect,
}: {
  visible: boolean;
  onSelect: (score: 1 | 2 | 3) => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {DOT_CONFIG.map((dot, i) => (
            <motion.div
              key={dot.score}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(dot.score);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onSelect(dot.score);
                }
              }}
              className={cn(
                "w-3 h-3 rounded-full transition-transform active:scale-125 cursor-pointer",
                dot.color
              )}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05, duration: 0.15 }}
              aria-label={dot.label}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
