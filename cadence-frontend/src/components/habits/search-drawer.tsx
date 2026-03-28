"use client";

import { useState, useRef, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSearch } from "@/lib/hooks/use-search";
import type { HabitResult, JournalResult, TagResult } from "@/lib/hooks/use-search";

interface SearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Search drawer — opens from the bottom and lets users search across
 * habits, journal entries, and tags. Add a search icon button to the
 * header that sets `open` to true to activate this drawer.
 */
export function SearchDrawer({ open, onOpenChange }: SearchDrawerProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { habitResults, journalResults, tagResults, loading } = useSearch(query);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    } else {
      setQuery("");
    }
  }, [open]);

  const hasQuery = query.trim().length > 0;
  const hasResults =
    habitResults.length > 0 ||
    journalResults.length > 0 ||
    tagResults.length > 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#0a0a0a] border-[#262626] max-h-[85svh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="sr-only">Search</DrawerTitle>
          {/* Search input */}
          <div className="relative">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search habits, journal, tags..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#141414] border border-[#262626] text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-[#363636] transition-colors"
            />
            {hasQuery && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>
        </DrawerHeader>

        {/* Results area */}
        <div className="px-4 pb-6 overflow-y-auto flex-1">
          {!hasQuery && (
            <p className="text-center text-sm text-muted-foreground/40 py-8">
              Type to search across your habits and journal
            </p>
          )}

          {hasQuery && loading && (
            <p className="text-center text-sm text-muted-foreground/40 py-8">
              Loading...
            </p>
          )}

          {hasQuery && !loading && !hasResults && (
            <p className="text-center text-sm text-muted-foreground/40 py-8">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {hasQuery && !loading && hasResults && (
            <div className="space-y-5">
              {/* Habit results */}
              {habitResults.length > 0 && (
                <ResultSection title="Habits">
                  {habitResults.map((r) => (
                    <HabitResultRow key={r.habit.id} result={r} />
                  ))}
                </ResultSection>
              )}

              {/* Journal results */}
              {journalResults.length > 0 && (
                <ResultSection title="Journal entries">
                  {journalResults.map((r) => (
                    <JournalResultRow key={r.dateKey} result={r} />
                  ))}
                </ResultSection>
              )}

              {/* Tag results */}
              {tagResults.length > 0 && (
                <ResultSection title="Tags">
                  {tagResults.map((r) => (
                    <TagResultRow key={r.tag} result={r} />
                  ))}
                </ResultSection>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ── Section wrapper ─────────────────────────────── */

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

/* ── Result rows ─────────────────────────────────── */

function HabitResultRow({ result }: { result: HabitResult }) {
  const { habit, completionRate } = result;
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#141414] border border-[#262626]">
      <span className="text-base shrink-0">{habit.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{habit.name}</p>
      </div>
      <span className="text-xs text-muted-foreground/60 shrink-0 font-mono">
        {completionRate}%
      </span>
    </div>
  );
}

function JournalResultRow({ result }: { result: JournalResult }) {
  const truncated =
    result.text.length > 80 ? result.text.slice(0, 80) + "..." : result.text;

  return (
    <div className="px-3 py-2.5 rounded-xl bg-[#141414] border border-[#262626]">
      <p className="text-[11px] text-muted-foreground/50 mb-1">
        {result.dateLabel}
      </p>
      <p className="text-sm text-foreground/80 leading-snug">{truncated}</p>
      {result.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {result.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] text-violet-400/70 bg-violet-400/10 rounded-full px-2 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function TagResultRow({ result }: { result: TagResult }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#141414] border border-[#262626]">
      <span className="text-sm text-violet-400/70 font-medium">
        {result.tag}
      </span>
      <span className="text-xs text-muted-foreground/50">
        {result.count} {result.count === 1 ? "entry" : "entries"}
      </span>
    </div>
  );
}
