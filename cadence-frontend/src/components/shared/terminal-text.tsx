"use client";

import { cn } from "@/lib/utils";

export function TerminalComment({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("text-terminal-comment text-xs italic", className)}>
    </span>
  );
}

export function TerminalPrompt({
  username = "user",
  command,
  className,
}: {
  username?: string;
  command: string;
  className?: string;
}) {
  return (
    <div className={cn("text-sm", className)}>
      <span className="text-terminal-green">{username}</span>
      <span className="text-terminal-muted">@</span>
      <span className="text-terminal-green">cadence</span>
      <span className="text-terminal-muted"> $ </span>
      <span className="text-foreground">{command}</span>
    </div>
  );
}
