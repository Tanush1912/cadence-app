export { type Mood, type JournalEntry } from "./journal";

export type GroupName = "morning" | "evening" | "anytime";

export type FrequencyType =
  | "daily"
  | "weekdays"
  | `weekly:${number}`
  | `days:${string}`;

export type FrictionScore = 1 | 2 | 3 | null;

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
}

export interface Log {
  done: boolean;
  friction: FrictionScore;
  retroactive: boolean;
  completedAt: number | null;
  skipped?: boolean;
  skipReason?: string;
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
