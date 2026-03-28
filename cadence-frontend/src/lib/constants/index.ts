import type { GroupName, Profile } from "@/lib/types";

export const GROUP_ORDER: GroupName[] = ["morning", "evening", "anytime"];

export const GROUP_LABELS: Record<GroupName, { label: string; emoji: string; description: string }> = {
  morning: { label: "Morning", emoji: "\u{1F305}", description: "// after waking up" },
  evening: { label: "Evening", emoji: "\u{1F319}", description: "// before bed" },
  anytime: { label: "Anytime", emoji: "\u{26A1}", description: "// whenever" },
};

export const FRICTION_TIMEOUT_MS = 3000;

export const FRICTION_LABELS = {
  1: "easy",
  2: "moderate",
  3: "hard",
} as const;

export const COLORS = {
  green: "#4ade80",
  amber: "#f59e0b",
  red: "#ef4444",
  gray: "#374151",
  comment: "#6b7280",
  bg: "#0d1117",
  bgCard: "#161b22",
  border: "#21262d",
  text: "#e6edf3",
  textMuted: "#8b949e",
} as const;

export const DEFAULT_PROFILE: Profile = {
  username: "user",
  dailyGoal: 0.7,
  accent: "green",
  createdAt: Date.now(),
};

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_NAMES_SHORT = ["M", "T", "W", "T", "F", "S", "S"] as const;
