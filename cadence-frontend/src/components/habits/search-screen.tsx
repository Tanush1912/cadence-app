"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSearch } from "@/lib/hooks/use-search";
import type {
  HabitResult,
  JournalResult,
  TagResult,
} from "@/lib/hooks/use-search";
import { fromDateKey, todayKey } from "@/lib/utils/dates";
import { haptic } from "@/lib/utils/haptics";

export interface SearchScreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDate?: (dateKey: string) => void;
  onSelectHabit?: (habitId: string) => void;
}

/** useSearch returns tags only for a non-empty query; "#" matches every extracted tag. */
const ALL_TAGS_QUERY = "#";
const RECENTS_KEY = "cadence:recent-searches";
const RECENTS_MAX = 8;
/** Must match the debounce inside useSearch so results and query settle together. */
const DEBOUNCE_MS = 200;

export function SearchScreen({
  open,
  onOpenChange,
  onSelectDate,
  onSelectHabit,
}: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>(() =>
    typeof window === "undefined" ? [] : readRecents()
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion() ?? false;

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;
  const effectiveQuery = hasQuery ? query : ALL_TAGS_QUERY;

  const { habitResults, journalResults, tagResults, loading } =
    useSearch(effectiveQuery);

  const [settledQuery, setSettledQuery] = useState(effectiveQuery);

  useEffect(() => {
    const timer = setTimeout(() => setSettledQuery(effectiveQuery), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [effectiveQuery]);

  const settled = settledQuery === effectiveQuery;

  const close = useCallback(() => {
    inputRef.current?.blur();
    onOpenChange(false);
  }, [onOpenChange]);

  const commitRecent = useCallback((term: string) => {
    const value = term.trim();
    if (!value) return;
    setRecents((prev) => {
      const next = [
        value,
        ...prev.filter((r) => r.toLowerCase() !== value.toLowerCase()),
      ].slice(0, RECENTS_MAX);
      writeRecents(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  const dismissKeyboard = useCallback(() => {
    if (document.activeElement === inputRef.current) inputRef.current?.blur();
  }, []);

  const handleSelectDate = useCallback(
    (dateKey: string) => {
      haptic("light");
      commitRecent(trimmed);
      onSelectDate?.(dateKey);
      close();
    },
    [commitRecent, trimmed, onSelectDate, close]
  );

  const handleSelectTag = useCallback(
    (tag: string) => {
      haptic("light");
      commitRecent(tag);
      setQuery(tag);
      inputRef.current?.focus();
    },
    [commitRecent]
  );

  const handleSelectHabit = useCallback(
    (habitId: string) => {
      haptic("light");
      commitRecent(trimmed);
      onSelectHabit?.(habitId);
      close();
    },
    [commitRecent, trimmed, onSelectHabit, close]
  );

  const hasResults =
    habitResults.length > 0 ||
    journalResults.length > 0 ||
    tagResults.length > 0;

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: "easeOut" as const };

  return (
    <AnimatePresence onExitComplete={() => setQuery("")}>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Search"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={transition}
          className="fixed inset-0 z-50 flex flex-col bg-background"
        >
          <div
            className="flex flex-none items-center gap-3 border-b border-border bg-background px-5 pb-3"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
          >
            <div className="flex h-11 flex-1 items-center gap-2.5 rounded-sm border border-border bg-secondary px-3 transition-colors focus-within:border-foreground/60">
              <SearchIcon className="flex-none text-ink-3" />
              {/* 16px minimum: anything smaller makes iOS Safari zoom the page on focus. */}
              <input
                ref={inputRef}
                autoFocus
                type="text"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitRecent(trimmed);
                    inputRef.current?.blur();
                  }
                }}
                placeholder="Habits, journal, tags"
                aria-label="Search habits, journal and tags"
                className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-ink-3"
              />
              {hasQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="-mr-2 flex h-11 w-10 flex-none items-center justify-center text-muted-foreground"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3">
                    <CloseIcon />
                  </span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              className="flex min-h-11 flex-none items-center px-1 text-body font-medium text-primary"
            >
              Cancel
            </button>
          </div>

          <div
            onTouchMove={dismissKeyboard}
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
          >
            {!hasQuery && (
              <EmptyState
                tags={settled ? tagResults : []}
                recents={recents}
                onSelectTag={handleSelectTag}
                onSelectRecent={(term) => {
                  setQuery(term);
                  inputRef.current?.focus();
                }}
              />
            )}

            {hasQuery && (!settled || loading) && (
              <p className="px-5 py-10 text-center text-label text-ink-3">
                Searching...
              </p>
            )}

            {hasQuery && settled && !loading && !hasResults && (
              <p className="px-5 py-10 text-center text-label text-ink-3">
                No results for &ldquo;{trimmed}&rdquo;
              </p>
            )}

            {hasQuery && settled && !loading && hasResults && (
              <>
                {habitResults.length > 0 && (
                  <>
                    <GroupLabel>Habits</GroupLabel>
                    {habitResults.map((result) => (
                      <HabitRow
                        key={result.habit.id}
                        result={result}
                        term={trimmed}
                        onSelect={onSelectHabit ? handleSelectHabit : undefined}
                      />
                    ))}
                  </>
                )}

                {journalResults.length > 0 && (
                  <>
                    <GroupLabel>
                      Journal &middot; {journalResults.length}{" "}
                      {journalResults.length === 1 ? "entry" : "entries"}
                    </GroupLabel>
                    {journalResults.map((result) => (
                      <JournalRow
                        key={result.dateKey}
                        result={result}
                        term={trimmed}
                        onSelect={handleSelectDate}
                      />
                    ))}
                  </>
                )}

                {tagResults.length > 0 && (
                  <>
                    <GroupLabel>Tags</GroupLabel>
                    {tagResults.map((result) => (
                      <TagRow
                        key={result.tag}
                        result={result}
                        onSelect={handleSelectTag}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function EmptyState({
  tags,
  recents,
  onSelectTag,
  onSelectRecent,
}: {
  tags: TagResult[];
  recents: string[];
  onSelectTag: (tag: string) => void;
  onSelectRecent: (term: string) => void;
}) {
  if (tags.length === 0 && recents.length === 0) {
    return (
      <p className="px-5 py-10 text-center text-label text-ink-3">
        Search across your habits, journal entries and tags.
      </p>
    );
  }

  return (
    <>
      {tags.length > 0 && (
        <>
          <GroupLabel>Jump to a tag</GroupLabel>
          <div className="flex flex-wrap gap-2 px-5">
            {tags.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => onSelectTag(t.tag)}
                className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-secondary px-4 text-label text-foreground active:bg-surface-3"
              >
                {t.tag}
                <span className="font-mono text-micro text-ink-3">
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {recents.length > 0 && (
        <>
          <GroupLabel>Recent</GroupLabel>
          {recents.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => onSelectRecent(term)}
              className="flex min-h-11 w-full items-center gap-3 px-5 text-left active:bg-secondary"
            >
              <ClockIcon className="flex-none text-ink-3" />
              <span className="min-w-0 flex-1 truncate text-body text-muted-foreground">
                {term}
              </span>
            </button>
          ))}
        </>
      )}
    </>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 pt-6 pb-2 text-micro text-ink-3">{children}</p>
  );
}

function Row({
  onSelect,
  children,
}: {
  onSelect?: () => void;
  children: React.ReactNode;
}) {
  const className =
    "flex min-h-11 w-full items-start gap-3 border-b border-border px-5 py-3 text-left last:border-b-0";
  if (!onSelect) return <div className={className}>{children}</div>;
  return (
    <button type="button" onClick={onSelect} className={`${className} active:bg-secondary`}>
      {children}
    </button>
  );
}

function HabitRow({
  result,
  term,
  onSelect,
}: {
  result: HabitResult;
  term: string;
  onSelect?: (habitId: string) => void;
}) {
  const { habit, completionRate } = result;
  return (
    <Row onSelect={onSelect ? () => onSelect(habit.id) : undefined}>
      <span className="flex-none pt-0.5 text-body" aria-hidden="true">
        {habit.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body text-foreground">
          <Highlight text={habit.name} term={term} />
        </span>
        <span className="mt-0.5 block truncate text-label text-muted-foreground">
          {habitSubtitle(habit.group, habit.frequency)}
        </span>
      </span>
      <span className="flex-none pt-0.5 font-mono text-micro text-ink-3">
        {completionRate}%
      </span>
    </Row>
  );
}

function JournalRow({
  result,
  term,
  onSelect,
}: {
  result: JournalResult;
  term: string;
  onSelect: (dateKey: string) => void;
}) {
  const snippet = useMemo(
    () => snippetAround(result.text, term),
    [result.text, term]
  );

  return (
    <Row onSelect={() => onSelect(result.dateKey)}>
      <JournalIcon className="flex-none pt-0.5 text-ink-3" />
      <span className="min-w-0 flex-1">
        <span className="block text-body text-foreground">
          {result.dateLabel}
        </span>
        <span className="mt-0.5 line-clamp-2 text-label text-muted-foreground">
          <Highlight text={snippet} term={term} />
        </span>
      </span>
      <span className="flex-none pt-1 font-mono text-micro text-ink-3">
        {relativeAge(result.dateKey)}
      </span>
    </Row>
  );
}

function TagRow({
  result,
  onSelect,
}: {
  result: TagResult;
  onSelect: (tag: string) => void;
}) {
  return (
    <Row onSelect={() => onSelect(result.tag)}>
      <HashIcon className="flex-none pt-0.5 text-ink-3" />
      <span className="min-w-0 flex-1 truncate text-body text-foreground">
        {result.tag}
      </span>
      <span className="flex-none pt-0.5 font-mono text-micro text-ink-3">
        {result.count}
      </span>
    </Row>
  );
}

function Highlight({ text, term }: { text: string; term: string }) {
  const q = term.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  const lower = q.toLowerCase();
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === lower ? (
          <mark
            key={i}
            className="rounded-none bg-foreground/20 px-0.5 text-foreground"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Window the snippet around the first match so the highlight is never clamped away. */
function snippetAround(text: string, term: string): string {
  const q = term.trim().toLowerCase();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx <= 40) return text;
  return `…${text.slice(idx - 40)}`;
}

function relativeAge(dateKey: string): string {
  const days = Math.round(
    (fromDateKey(todayKey()).getTime() - fromDateKey(dateKey).getTime()) /
      86400000
  );
  if (days <= 0) return "Today";
  if (days < 365) return `${days}d`;
  return `${Math.floor(days / 365)}y`;
}

function habitSubtitle(group: string, frequency: string): string {
  return `${capitalize(group)} · ${frequencyLabel(frequency)}`;
}

function frequencyLabel(frequency: string): string {
  if (frequency === "weekdays") return "Weekdays";
  if (frequency.startsWith("weekly:")) {
    const n = Number.parseInt(frequency.slice(7), 10);
    return Number.isFinite(n) ? `${n}x a week` : "Weekly";
  }
  if (frequency.startsWith("days:")) {
    const days = frequency
      .slice(5)
      .split(",")
      .map((d) => capitalize(d.trim()))
      .filter(Boolean);
    return days.length > 0 ? days.join(" ") : "Daily";
  }
  return "Daily";
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .slice(0, RECENTS_MAX);
  } catch {
    return [];
  }
}

function writeRecents(list: string[]): void {
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch {
    // localStorage throws in private-mode and locked-down iOS contexts.
  }
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function JournalIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <rect x="9" y="1.5" width="6" height="4" rx="1.4" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" />
    </svg>
  );
}
