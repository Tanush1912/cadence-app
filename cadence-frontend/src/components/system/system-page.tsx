"use client";

import { useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useGun } from "@/lib/gun/gun-provider";
import { useProfile } from "@/lib/hooks/use-profile";
import { useExport } from "@/lib/hooks/use-export";
import { useGunMap } from "@/lib/hooks/use-gun-node";
import { useBundles } from "@/lib/hooks/use-bundles";
import { useExperiments } from "@/lib/hooks/use-experiments";
import { todayKey } from "@/lib/utils/dates";
import { HabitListEditor } from "./habit-list-editor";
import { ExperimentCreator } from "./experiment-creator";
import { BundleEditor } from "./bundle-editor";
import { ReminderSettings } from "./reminder-settings";
import { SettingsSheet } from "./settings-sheet";
import {
  SettingsAction,
  SettingsGroup,
  SettingsGroupLabel,
  SettingsRow,
  SettingsRowLabel,
  SettingsSlider,
  SettingsToggleRow,
  SettingsValue,
} from "./settings-row";
import { HabitDrawer } from "@/components/habits/habit-drawer";
import type { Habit, Profile } from "@/lib/types";

const ACCENT_COLORS: { value: string; color: string; label: string }[] = [
  { value: "white", color: "#fafafa", label: "White" },
  { value: "cyan", color: "#2dd4bf", label: "Teal" },
  { value: "amber", color: "#f59e0b", label: "Amber" },
  { value: "green", color: "#4ade80", label: "Green" },
  { value: "rose", color: "#fb7185", label: "Rose" },
  { value: "purple", color: "#a78bfa", label: "Purple" },
  { value: "blue", color: "#60a5fa", label: "Blue" },
];

export function SystemPage() {
  const gun = useGun();
  const { profile, updateProfile } = useProfile();
  const { exportJSON, exportMarkdown } = useExport();

  // Gun's .off() is aggressive (gun.js:1263), so these subscriptions stay on the
  // always-mounted page rather than inside sheets that unmount on close.
  const { data: rawHabits, loading: habitsLoading } =
    useGunMap<Record<string, unknown>>("habits");
  const {
    bundles,
    createBundle,
    deleteBundle,
    loading: bundlesLoading,
  } = useBundles();
  const {
    activeExperiment,
    isExpired,
    createExperiment,
    endExperiment,
    loading: experimentsLoading,
  } = useExperiments();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitsSheetOpen, setHabitsSheetOpen] = useState(false);
  const [bundlesSheetOpen, setBundlesSheetOpen] = useState(false);
  const [experimentsSheetOpen, setExperimentsSheetOpen] = useState(false);

  const { active, archived } = useMemo(() => {
    const all = Object.entries(rawHabits).map(
      ([id, raw]) => ({ ...raw, id } as unknown as Habit)
    );
    return {
      active: all
        .filter((h) => !h.archived)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      archived: all
        .filter((h) => h.archived)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    };
  }, [rawHabits]);

  const bundleCount = Object.keys(bundles).length;
  const isMinimumMode = !!(
    profile.minimumMode && profile.minimumModeDate === todayKey()
  );

  const handleEdit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setDrawerOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingHabit(null);
    setDrawerOpen(true);
  }, []);

  const handleClearData = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    if (!gun) return;
    gun.get("habits").map().once((_: unknown, key: string) => {
      gun.get("habits").get(key).put(null);
    });
    gun.get("logs").map().once((_: unknown, key: string) => {
      gun.get("logs").get(key).put(null);
    });
    gun.get("profile").put(null);
    setConfirmClear(false);
  }, [gun, confirmClear]);

  const handleGoalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      updateProfile({ dailyGoal: val });
    },
    [updateProfile]
  );

  const handleMinimumMode = useCallback(
    (next: boolean) => {
      updateProfile(
        next
          ? { minimumMode: true, minimumModeDate: todayKey() }
          : { minimumMode: false, minimumModeDate: "" }
      );
    },
    [updateProfile]
  );

  return (
    <div
      className="mx-auto w-full max-w-lg px-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
      }}
    >
      <h1 className="text-page-title font-semibold tracking-tight text-foreground">
        Settings
      </h1>

      <SettingsGroupLabel>Your system</SettingsGroupLabel>
      <SettingsGroup>
        <SettingsAction
          label="Habits"
          value={`${active.length} active`}
          onClick={() => setHabitsSheetOpen(true)}
        />
        <SettingsAction
          label="Bundles"
          value={`${bundleCount} of 3`}
          onClick={() => setBundlesSheetOpen(true)}
        />
        <SettingsAction
          label="Experiments"
          value={activeExperiment ? "1 running" : "none"}
          onClick={() => setExperimentsSheetOpen(true)}
        />
      </SettingsGroup>

      <SettingsGroupLabel>Daily</SettingsGroupLabel>
      <SettingsGroup>
        <ReminderSettings />
        <SettingsRow className="flex-col items-stretch gap-1 py-2">
          <div className="flex items-center justify-between">
            <span className="text-body text-foreground">Daily goal</span>
            <SettingsValue>
              {Math.round((profile.dailyGoal ?? 0.7) * 100)}%
            </SettingsValue>
          </div>
          <SettingsSlider
            label="Daily goal"
            min={0.5}
            max={1}
            step={0.05}
            value={profile.dailyGoal ?? 0.7}
            onChange={handleGoalChange}
          />
        </SettingsRow>
        <SettingsToggleRow
          label="Minimum mode"
          checked={isMinimumMode}
          onChange={handleMinimumMode}
        />
      </SettingsGroup>

      <SettingsGroupLabel>AI features</SettingsGroupLabel>
      <SettingsGroup>
        {profile.aiKey ? (
          <SettingsRow>
            <span className="size-2 shrink-0 rounded-full bg-primary" />
            <SettingsRowLabel>Gemini key added</SettingsRowLabel>
            <button
              type="button"
              onClick={() => {
                setApiKeyInput("");
                updateProfile({ aiKey: "" });
              }}
              className="-mr-2 flex h-11 shrink-0 items-center px-2 text-label text-destructive"
            >
              Remove
            </button>
          </SettingsRow>
        ) : (
          <SettingsRow className="flex-col items-stretch gap-2 py-3">
            <label htmlFor="gemini-key" className="text-micro text-ink-3">
              Gemini API key
            </label>
            <input
              id="gemini-key"
              type="password"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                updateProfile({ aiKey: e.target.value });
              }}
              placeholder="AIza..."
              className="w-full rounded-sm border border-border bg-background px-3 py-3 font-mono text-body text-foreground transition-colors outline-none placeholder:text-ink-3 focus:border-surface-3"
            />
            <p className="text-micro text-muted-foreground">
              Enables AI reflections, voice transcription, and check-in.
            </p>
          </SettingsRow>
        )}
      </SettingsGroup>

      <SettingsGroupLabel>Appearance</SettingsGroupLabel>
      <SettingsGroup>
        <SettingsRow>
          <SettingsRowLabel>Accent</SettingsRowLabel>
          <div className="-mr-1 flex shrink-0 items-center">
            {ACCENT_COLORS.map(({ value, color, label }) => {
              const isSelected = (profile.accent ?? "green") === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  aria-pressed={isSelected}
                  onClick={() =>
                    updateProfile({ accent: value as Profile["accent"] })
                  }
                  className="flex h-11 w-9 items-center justify-center"
                >
                  <span
                    className={cn(
                      "size-[22px] rounded-full",
                      isSelected && "outline-2 outline-offset-2 outline-foreground"
                    )}
                    style={{ backgroundColor: color }}
                  />
                </button>
              );
            })}
          </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroupLabel>Data</SettingsGroupLabel>
      <SettingsGroup>
        <SettingsAction label="Export JSON" onClick={exportJSON} />
        <SettingsAction label="Export Markdown" onClick={exportMarkdown} />
      </SettingsGroup>

      <div className="pt-6">
        <SettingsGroup>
          <SettingsAction
            label={confirmClear ? "Tap again to clear everything" : "Clear all data"}
            destructive
            chevron={false}
            onClick={handleClearData}
          />
          {confirmClear && (
            <SettingsAction
              label="Cancel"
              chevron={false}
              onClick={() => setConfirmClear(false)}
            />
          )}
        </SettingsGroup>
      </div>

      <p className="pt-8 text-center text-micro text-ink-3">
        Cadence 2.0
        <br />
        Your data stays on your device.
      </p>

      <SettingsSheet
        open={habitsSheetOpen}
        onOpenChange={setHabitsSheetOpen}
        title="Habits"
        description={`${active.length} active. Tap a habit to edit it, or archive it to hide it without losing its history.`}
      >
        <HabitListEditor
          active={active}
          archived={archived}
          loading={habitsLoading}
          onEdit={handleEdit}
          onAdd={handleAdd}
        />
      </SettingsSheet>

      <SettingsSheet
        open={bundlesSheetOpen}
        onOpenChange={setBundlesSheetOpen}
        title="Bundles"
        description={`Group habits so one tap completes all of them. ${bundleCount} of 3 used.`}
      >
        <BundleEditor
          bundles={bundles}
          createBundle={createBundle}
          deleteBundle={deleteBundle}
          loading={bundlesLoading}
        />
      </SettingsSheet>

      <SettingsSheet
        open={experimentsSheetOpen}
        onOpenChange={setExperimentsSheetOpen}
        title="Experiments"
        description="Change one thing about a habit for two weeks, then compare consistency before and after. One at a time."
      >
        <ExperimentCreator
          activeExperiment={activeExperiment}
          isExpired={isExpired}
          createExperiment={createExperiment}
          endExperiment={endExperiment}
          loading={experimentsLoading}
        />
      </SettingsSheet>

      <HabitDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        editingHabit={editingHabit}
      />
    </div>
  );
}
