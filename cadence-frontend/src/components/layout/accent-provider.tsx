"use client";

import { useEffect } from "react";
import { useProfile } from "@/lib/hooks/use-profile";

const ACCENT_MAP: Record<string, string> = {
  white: "#fafafa",
  green: "#4ade80",
  cyan: "#2dd4bf",
  amber: "#f59e0b",
  rose: "#fb7185",
  purple: "#a78bfa",
  blue: "#60a5fa",
};

/**
 * Reads the accent color from profile and sets CSS custom properties
 * on the document root so the entire app recolors dynamically.
 */
export function AccentProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();

  useEffect(() => {
    const color = ACCENT_MAP[profile.accent] || ACCENT_MAP.cyan;
    const root = document.documentElement;
    root.style.setProperty("--primary", color);
    root.style.setProperty("--ring", color);
    root.style.setProperty("--chart-1", color);
    root.style.setProperty("--sidebar-primary", color);
    root.style.setProperty("--sidebar-ring", color);
  }, [profile.accent]);

  return <>{children}</>;
}
