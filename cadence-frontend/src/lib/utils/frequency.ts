import { fromDateKey, getISOWeekday } from "./dates";

const DAY_MAP: Record<string, number> = {
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

/**
 * Determine if a habit with the given frequency is scheduled on a specific date.
 *
 * Frequency formats:
 * - "daily" — every day
 * - "weekdays" — Mon-Fri
 * - "weekly:N" — any N days per week (always returns true, quota tracked separately)
 * - "days:mon,wed,fri" — specific days
 */
export function isScheduledOn(frequency: string, dateKey: string): boolean {
  const date = fromDateKey(dateKey);
  const isoDay = getISOWeekday(date);

  if (frequency === "daily") return true;
  if (frequency === "weekdays") return isoDay <= 4;

  if (frequency.startsWith("weekly:")) {
    return true;
  }

  if (frequency.startsWith("days:")) {
    const days = frequency.slice(5).split(",").map((d) => d.trim().toLowerCase());
    return days.some((d) => DAY_MAP[d] === isoDay);
  }

  return true;
}

/** Get the weekly quota for a frequency, or null if not quota-based */
export function getWeeklyQuota(frequency: string): number | null {
  if (frequency.startsWith("weekly:")) {
    return parseInt(frequency.slice(7), 10);
  }
  return null;
}

/** Get the streak period type for a frequency */
export function getStreakType(frequency: string): "day" | "week" {
  if (frequency === "daily") return "day";
  if (frequency === "weekdays") return "day";
  if (frequency.startsWith("days:")) return "week";
  if (frequency.startsWith("weekly:")) return "week";
  return "day";
}
