export { type Mood, type JournalEntry } from "./journal";

export type GroupName = "morning" | "evening" | "anytime";

export type FrequencyType =
  | "daily"
  | "weekdays"
  | `weekly:${number}`
  | `days:${string}`;

export type FrictionScore = 1 | 2 | 3 | null;

export type HabitType = "build" | "quit";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  group: GroupName;
  frequency: string;
  floor?: string;
  color?: string;
  order: number;
  archived: boolean;
  createdAt: number;
  type?: HabitType;
}

/** Absent `type` means build. Every habit created before quit habits existed keeps working. */
export function isQuitHabit(habit: { type?: HabitType } | null | undefined): boolean {
  return habit?.type === "quit";
}

export interface Log {
  done: boolean;
  friction: FrictionScore;
  retroactive: boolean;
  completedAt: number | null;
  skipped?: boolean;
  skipReason?: string;
  slipped?: boolean;
  slipReason?: string;
}

/** slipReason is "<trigger>" or "<trigger>: <note>", so slips can be grouped by trigger. */
export function composeSlipReason(trigger: string | null, note: string): string {
  const text = note.trim();
  if (trigger && text) return `${trigger}: ${text}`;
  if (trigger) return trigger;
  return text;
}

export function slipTrigger(reason: string | undefined): string {
  if (!reason) return "";
  const head = reason.split(":")[0].trim();
  return head || reason.trim();
}

export interface Streak {
  current: number;
  best: number;
  type: "day" | "week";
}

export interface Profile {
  username: string;
  dailyGoal: number;
  accent: "green" | "amber" | "cyan";
  createdAt: number;
}
