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
import { DailyProgressBar } from "./daily-progress-bar";
import { HabitDrawer } from "./habit-drawer";
import { JournalCard } from "./journal-card";
import { CheckinDrawer } from "./checkin-drawer";
import { FocusCard } from "./focus-card";
import { useProfile } from "@/lib/hooks/use-profile";
import { useFocusHabit } from "@/lib/hooks/use-focus-habit";
import { useExperiments } from "@/lib/hooks/use-experiments";
import { ExperimentCard } from "./experiment-card";
import { SearchDrawer } from "./search-drawer";
import { SkipDrawer } from "./skip-drawer";
import { ReflectionDrawer } from "./reflection-drawer";
import { BundleCard } from "./bundle-card";
import { StreakRecoveryBanner } from "./streak-recovery-banner";
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
  const focusHabit = useFocusHabit(selectedDate);
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
  const [reflectionOpen, setReflectionOpen] = useState(false);
  const [skipDrawerOpen, setSkipDrawerOpen] = useState(false);
  const [skippingHabit, setSkippingHabit] = useState<Habit | null>(null);

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

  if (!gun) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
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
      />

      <DaySelector
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        weekProgress={weekProgress}
      />

      <div className="flex-1 overflow-y-auto">
        {/* Streak recovery banner */}
        {isToday(selectedDate) && (
          <StreakRecoveryBanner
            onDismiss={() => {}}
            recoveriesUsed={0}
            maxRecoveries={2}
          />
        )}

        {/* Journal — above habits */}
        <div className="px-4 pb-2">
          <JournalCard dateKey={selectedDate} />
        </div>

        {/* Bundles — one-tap complete */}
        {isToday(selectedDate) && Object.keys(bundles).length > 0 && (
          <div className="px-4 pb-2 space-y-2">
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
          <div className="px-4 pb-2">
            <ExperimentCard
              experiment={activeExperiment}
              habitName={rawHabits[activeExperiment.habitId].name}
              habitEmoji={rawHabits[activeExperiment.habitId].emoji}
              onEnd={endExperiment}
            />
          </div>
        )}

        {/* Next best action — replaces focus card */}
        {isToday(selectedDate) && nextAction && !isMinimumMode && (
          <div className="px-5 pb-2">
            <p className="text-[13px]" style={{ color: "var(--primary)" }}>
              {nextAction.message}
            </p>
          </div>
        )}

        {/* Auto-simplification banner */}
        {health.shouldSimplify && !isMinimumMode && (
          <div className="px-4 pb-2">
            <div className="px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <p className="text-[11px] text-amber-400/70">
                simplified — your system needs a reset
              </p>
            </div>
          </div>
        )}

        {/* Minimum mode toggle */}
        {isToday(selectedDate) && (
          <div className="px-4 pb-2 flex items-center justify-between">
            <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />
          </div>
        )}
        {!isToday(selectedDate) && (
          <CategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />
        )}

        <div className="px-4 pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : filteredHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/30">
              <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
            </svg>
            <p className="text-sm text-muted-foreground">No habits for this day</p>
            <button
              onClick={handleAddNew}
              className="text-sm text-primary font-medium mt-1"
            >
              Add your first habit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
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
                minimumMode={isMinimumMode}
                nudge={nudges[habit.id] || null}
              />
            ))}
          </div>
        )}
        </div>
      </div>

      <DailyProgressBar
        completed={completed}
        total={total}
        percentage={percentage}
        goal={0.7}
      />

      {/* Floating check-in button — show when viewing today + habits exist */}
      {isToday(selectedDate) && total > 0 && (
        <button
          onClick={() => setCheckinOpen(true)}
          className="fixed bottom-[140px] right-5 w-9 h-9 rounded-full text-[#0a0a0a] shadow-lg flex items-center justify-center transition-colors z-10"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      <SearchDrawer
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />

      <SkipDrawer
        open={skipDrawerOpen}
        habit={skippingHabit}
        dateKey={selectedDate}
        onOpenChange={setSkipDrawerOpen}
      />

      <ReflectionDrawer
        open={reflectionOpen}
        onOpenChange={setReflectionOpen}
        weekSummary={null}
        apiKey={profile.aiKey}
      />
    </div>
  );
}
