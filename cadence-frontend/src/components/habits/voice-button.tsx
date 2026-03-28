"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "recording" | "transcribing" | "done";

export function VoiceButton({
  state,
  onTap,
  className,
}: {
  state: VoiceState;
  onTap: () => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <motion.button
        onClick={onTap}
        className={cn(
          "relative z-10 w-9 h-9 rounded-full flex items-center justify-center transition-colors",
          state === "recording"
            ? "bg-red-500/20 text-red-400"
            : state === "transcribing"
              ? "bg-[#1a1a1a] text-muted-foreground"
              : "bg-[#1a1a1a] text-muted-foreground hover:text-foreground"
        )}
        whileTap={{ scale: 0.92 }}
        disabled={state === "transcribing"}
      >
        {state === "transcribing" ? (
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
        ) : state === "recording" ? (
          /* Stop icon — square */
          <div className="w-3.5 h-3.5 rounded-sm bg-red-400" />
        ) : (
          /* Mic icon */
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        )}
      </motion.button>

      {/* Status label */}
      {state === "done" && (
        <motion.span
          className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap"
          style={{ color: "var(--primary)" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          {"✓"} transcribed
        </motion.span>
      )}
    </div>
  );
}
