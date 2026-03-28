/**
 * Date utilities for Cadence.
 * All dates are stored and compared as YYYY-MM-DD strings.
 */

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function isToday(dateKey: string): boolean {
  return dateKey === todayKey();
}

export function isFuture(dateKey: string): boolean {
  return dateKey > todayKey();
}

export function isPast(dateKey: string): boolean {
  return dateKey < todayKey();
}

/** Returns 0=Mon ... 6=Sun (ISO weekday) */
export function getISOWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

/** Get the Monday of the week containing the given date */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const iso = getISOWeekday(d);
  d.setDate(d.getDate() - iso);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get 7 date keys for the week containing the given date (Mon-Sun) */
export function getWeekDays(dateKey: string): string[] {
  const date = fromDateKey(dateKey);
  const monday = getWeekStart(date);
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(toDateKey(d));
  }
  return days;
}

/** Format a date key as "Friday, March 27 2026" */
export function formatDateLong(dateKey: string): string {
  const date = fromDateKey(dateKey);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Format a date key as "Fri Mar 27" */
export function formatDateShort(dateKey: string): string {
  const date = fromDateKey(dateKey);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Get day number from date key */
export function getDayNumber(dateKey: string): number {
  return fromDateKey(dateKey).getDate();
}

/** Add days to a date key */
export function addDays(dateKey: string, days: number): string {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Check if a date is within N days before today */
export function isWithinPastDays(dateKey: string, n: number): boolean {
  const today = todayKey();
  const cutoff = addDays(today, -n);
  return dateKey >= cutoff && dateKey <= today;
}

/** Check if a date is editable (today or past 3 days) */
export function isEditable(dateKey: string): boolean {
  return isWithinPastDays(dateKey, 3);
}
