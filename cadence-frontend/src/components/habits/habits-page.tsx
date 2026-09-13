"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { useSelectedDate } from "@/lib/hooks/use-selected-date";
import { useHabits } from "@/lib/hooks/use-habits";
import { useLogs } from "@/lib/hooks/use-logs";
import { useStreaks } from "@/lib/hooks/use-streaks";
import { useDailyProgress } from "@/lib/hooks/use-daily-progress";
import { useAllHeatmapData } from "@/lib/hooks/use-heatmap-data";
import { useSharedData } from "@/lib/gun/data-provider";
import { AppHeader } from "@/components/layout/terminal-header";
import { DaySelector } from "./day-selector";
import { CategoryFilter } from "./category-filter";
import { HabitCard } from "./habit-card";
import { HabitDrawer } from "./habit-drawer";
import { JournalCard } from "./journal-card";
import { CheckinDrawer } from "./checkin-drawer";
import { useProfile } from "@/lib/hooks/use-profile";
import { useExperiments } from "@/lib/hooks/use-experiments";
import { ExperimentCard } from "./experiment-card";
import { SearchScreen } from "./search-screen";
import { SkipDrawer } from "./skip-drawer";
import { BundleCard } from "./bundle-card";
import { StreakRecoveryBanner } from "./streak-recovery-banner";
import { CalendarDrawer } from "./calendar-drawer";
import { useCoachingNudges } from "@/lib/hooks/use-coaching-nudges";
import { useBundles } from "@/lib/hooks/use-bundles";
import { useNextAction } from "@/lib/hooks/use-next-action";
import { useSystemHealth } from "@/lib/hooks/use-system-health";
import { isToday, todayKey } from "@/lib/utils/dates";
import type { Habit, GroupName, FrictionScore } from "@/lib/types";

export function HabitsPage() {
  const gun = useGun();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const { habits, loading: habitsLoading } = useHabits(selectedDate);
  const { logs, toggleLog, setFriction, loading: logsLoading } = useLogs(selectedDate);
  const { streaks, recomputeStreak } = useStreaks();
  const { completed, total, percentage } = useDailyProgress(habits, logs);
  const { profile, updateProfile } = useProfile();
  const { activeExperiment, isExpired, endExperiment } = useExperiments();
  const { habits: rawHabits } = useSharedData();
  const nudges = useCoachingNudges();
  const { bundles } = useBundles();
  const nextAction = useNextAction(logs, total, completed);
  const health = useSystemHealth();

  const isMinimumMode = !!(profile.minimumMode && profile.minimumModeDate === todayKey());
  const toggleMinimumMode = useCallback(() => {
    if (isMinimumMode) {
      updateProfile({ minimumMode: false, minimumModeDate: "" });
    } else {
      updateProfile({ minimumMode: true, minimumModeDate: todayKey() });
    }
  }, [isMinimumMode, updateProfile]);

  const [categoryFilter, setCategoryFilter] = useState<GroupName | "all">("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [skipDrawerOpen, setSkipDrawerOpen] = useState(false);
  const [skippingHabit, setSkippingHabit] = useState<Habit | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarHabit, setCalendarHabit] = useState<Habit | null>(null);

  const habitIds = useMemo(() => habits.map((h) => h.id), [habits]);
  const heatmapData = useAllHeatmapData(habitIds);

  useEffect(() => {
    if (false) {
    }
  }, [gun]);

  const handleToggle = useCallback((habitId: string): boolean | undefined => {
    const result = toggleLog(habitId);
    const habit = habits.find((h) => h.id === habitId);
    if (habit) recomputeStreak(habitId, habit.frequency);
    return result;
  }, [toggleLog, habits, recomputeStreak]);

  const handleFriction = useCallback((habitId: string, score: FrictionScore) => {
    setFriction(habitId, score);
  }, [setFriction]);

  const handleEdit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setDrawerOpen(true);
  }, []);

  const handleArchive = useCallback((habit: Habit) => {
    if (!gun) return;
    gun.get("habits").get(habit.id).put({ archived: true });
  }, [gun]);

  const handleSkip = useCallback((habit: Habit) => {
    setSkippingHabit(habit);
    setSkipDrawerOpen(true);
  }, []);

  const handleCalendar = useCallback((habit: Habit) => {
    setCalendarHabit(habit);
    setCalendarOpen(true);
  }, []);

  const handleAddNew = useCallback(() => {
    setEditingHabit(null);
    setDrawerOpen(true);
  }, []);

  const isAutoSimplified = health.shouldSimplify && !isMinimumMode;
  const effectiveMinMode = isMinimumMode || isAutoSimplified;

  const filteredHabits = useMemo(() => {
    let list = habits;
    if (effectiveMinMode) list = list.filter((h) => h.floor && h.floor.trim().length > 0);
    if (categoryFilter !== "all") list = list.filter((h) => h.group === categoryFilter);
    return list;
  }, [habits, categoryFilter, effectiveMinMode]);

  const weekProgress = useMemo(() => {
    const progress: Record<string, number> = {};
    if (total > 0) progress[selectedDate] = percentage;
    return progress;
  }, [selectedDate, percentage, total]);

  const loading = habitsLoading || logsLoading;

  // One banner slot by priority: the mode you chose, then the one the system chose, then the nudge.
  const bannerSlot = isMinimumMode ? (
    <div className="px-5 pb-2">
      <div className="rounded-sm border border-amber-500/15 bg-amber-500/10 px-3 py-2">
        <p className="text-micro text-amber-400">
          Minimum mode. Floor versions only, resets tomorrow.
        </p>
      </div>
    </div>
  ) : isAutoSimplified ? (
    <div className="px-5 pb-2">
      <div className="rounded-sm border border-amber-500/15 bg-amber-500/10 px-3 py-2">
        <p className="text-micro text-amber-400">Simplified. Focus on your minimum.</p>
      </div>
    </div>
  ) : isToday(selectedDate) ? (
    <div className="px-5 pb-2">
      <StreakRecoveryBanner
        onDismiss={() => {}}
        recoveriesUsed={0}
        maxRecoveries={2}
      />
    </div>
  ) : null;

  if (!gun) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface-3 border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AppHeader
        selectedDate={selectedDate}
        onAdd={handleAddNew}
        onSearch={() => setSearchOpen(true)}
        minimumMode={isMinimumMode}
        onToggleMinimumMode={isToday(selectedDate) ? toggleMinimumMode : undefined}
        completed={completed}
        total={total}
      />

      {/* One banner slot, highest priority wins — modes never stack */}
      {bannerSlot}

      <DaySelector
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        weekProgress={weekProgress}
      />

      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 128px)" }}>
        {/* Next best action — the system speaking */}
        {isToday(selectedDate) && nextAction && !isMinimumMode && (
          <p className="px-5 pt-3 pb-1 text-title font-medium tracking-tight text-balance" style={{ color: "var(--primary)" }}>
            {nextAction.message}
          </p>
        )}

        {/* Journal — above habits */}
        <div className="px-5 pt-2 pb-2">
          <JournalCard dateKey={selectedDate} />
        </div>

        {/* Bundles — one-tap complete */}
        {isToday(selectedDate) && Object.keys(bundles).length > 0 && (
          <div className="space-y-2 px-5 pb-2">
            {Object.values(bundles).map((b) => {
              const ids = b.habitIds.split(",").filter(Boolean);
              const names: Record<string, string> = {};
              ids.forEach((id) => { if (rawHabits[id]) names[id] = rawHabits[id].name; });
              const completed = new Set(ids.filter((id) => logs[id]?.done));
              return (
                <BundleCard
                  key={b.id}
                  bundleName={b.name}
                  habitIds={ids}
                  habitNames={names}
                  completedHabitIds={completed}
                  onComplete={() => {}}
                />
              );
            })}
          </div>
        )}

        {/* Active experiment */}
        {activeExperiment && rawHabits[activeExperiment.habitId] && (
          <div className="px-5 pb-2">
            <ExperimentCard
              experiment={activeExperiment}
              habitName={rawHabits[activeExperiment.habitId].name}
              habitEmoji={rawHabits[activeExperiment.habitId].emoji}
              onEnd={endExperiment}
            />
          </div>
        )}

        <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />

        <div className="px-5 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-surface-3 border-t-foreground" />
          </div>
        ) : filteredHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
              <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
            </svg>
            <p className="text-body text-muted-foreground">No habits for this day</p>
            <button
              onClick={handleAddNew}
              className="relative mt-1 min-h-11 text-body font-medium text-primary"
            >
              Add your first habit
            </button>
          </div>
        ) : (
          <div className={isMinimumMode ? "space-y-2" : "space-y-3"}>
            {filteredHabits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                log={logs[habit.id]}
                streak={streaks[habit.id]}
                dateKey={selectedDate}
                heatmapData={heatmapData[habit.id] || []}
                onToggle={handleToggle}
                onFriction={handleFriction}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onSkip={handleSkip}
                onCalendar={handleCalendar}
                minimumMode={isMinimumMode}
                nudge={nudges[habit.id] || null}
              />
            ))}
          </div>
        )}
        </div>

      </div>

      {/* Floating check-in button — show when viewing today + habits exist */}
      {isToday(selectedDate) && total > 0 && (
        <button
          onClick={() => setCheckinOpen(true)}
          aria-label="AI check-in"
          className="fixed right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-colors"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)", backgroundColor: "var(--primary)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
          </svg>
        </button>
      )}

      <HabitDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editingHabit={editingHabit}
      />

      <CheckinDrawer
        open={checkinOpen}
        onOpenChange={setCheckinOpen}
        habits={habits}
        dateKey={selectedDate}
      />

      {/* Always mounted: preloads its subscription and autofocuses inside the click gesture. */}
      <SearchScreen
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelectDate={setSelectedDate}
      />

      <SkipDrawer
        open={skipDrawerOpen}
        habit={skippingHabit}
        dateKey={selectedDate}
        onOpenChange={setSkipDrawerOpen}
      />


      {calendarHabit && (
        <CalendarDrawer
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
          habit={calendarHabit}
          heatmapData={heatmapData[calendarHabit.id] || []}
          onSelectDate={setSelectedDate}
        />
      )}
    </div>
  );
}
