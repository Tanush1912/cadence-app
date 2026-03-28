"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HabitCheckbox({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.span
      className={cn(
        "text-sm font-bold select-none",
        checked ? "text-terminal-green" : "text-terminal-muted",
        disabled && "opacity-40"
      )}
      animate={checked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {checked ? "[\u2713]" : "[ ]"}
    </motion.span>
  );
}
