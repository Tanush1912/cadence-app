"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useGun } from "@/lib/gun/gun-provider";
import { useProfile } from "@/lib/hooks/use-profile";
import { useExport } from "@/lib/hooks/use-export";
import { SettingsCard } from "./settings-card";
import { HabitListEditor } from "./habit-list-editor";
import { ExperimentCreator } from "./experiment-creator";
import { ReminderSettings } from "./reminder-settings";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Habit, Profile } from "@/lib/types";
import {
  Download,
  FileText,
  Trash2,
  Check,
} from "lucide-react";

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

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const handleEdit = useCallback((habit: Habit) => {
  }, []);

  const handleAdd = useCallback(() => {
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

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 px-4 pb-24" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)" }}>
      <h1 className="text-lg font-semibold text-[#fafafa]">Settings</h1>

      {/* Habits */}
      <SettingsCard title="Habits">
        <HabitListEditor onEdit={handleEdit} onAdd={handleAdd} />
      </SettingsCard>

      {/* Experiments */}
      <ExperimentCreator />

      {/* Gemini API Key — compact pill when set, input when not */}
      {profile.aiKey ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#141414] rounded-full border border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
            <span className="text-sm text-muted-foreground">Gemini key added</span>
          </div>
          <button
            onClick={() => {
              setApiKeyInput("");
              updateProfile({ aiKey: "" });
            }}
            className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="px-4 py-3 bg-[#141414] rounded-2xl border border-[#262626] space-y-2">
          <label className="text-xs text-muted-foreground">Gemini API Key</label>
          <div className="relative">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                updateProfile({ aiKey: e.target.value });
              }}
              placeholder="AIza..."
              className="w-full rounded-lg border border-[#262626] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#fafafa] outline-none transition-colors focus:border-[#404040]"
            />
          </div>
          <p className="text-[11px] text-muted-foreground/40">
            Enables AI reflections, voice transcription, and check-in.
          </p>
        </div>
      )}

      {/* Reminders */}
      <ReminderSettings />

      {/* Appearance */}
      <SettingsCard title="Appearance">
        <div className="space-y-4">
          {/* Daily goal slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">
                Daily goal
              </label>
              <span className="font-mono text-xs text-[#fafafa]">
                {Math.round((profile.dailyGoal ?? 0.7) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={profile.dailyGoal ?? 0.7}
              onChange={handleGoalChange}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#262626] accent-[#fafafa] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fafafa]"
            />
            <div className="flex justify-between text-[10px] text-[#404040]">
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <Separator className="bg-[#262626]" />

          {/* Accent color */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              Accent color
            </label>
            <div className="flex gap-3">
              {ACCENT_COLORS.map(({ value, color, label }) => {
                const isSelected =
                  (profile.accent ?? "green") === value;
                return (
                  <button
                    key={value}
                    type="button"
                    title={label}
                    onClick={() =>
                      updateProfile({
                        accent: value as Profile["accent"],
                      })
                    }
                    className={cn(
                      "relative flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110",
                      value === "white" && "ring-1 ring-white/20"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {isSelected && (
                      <Check className="size-4 text-black" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Data */}
      {/* Data — tucked away, not prominent */}
      <div className="px-1 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={exportJSON} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Export JSON
          </button>
          <span className="text-muted-foreground/20">&middot;</span>
          <button onClick={exportMarkdown} className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            Export Markdown
          </button>
          <span className="text-muted-foreground/20">&middot;</span>
          <button
            onClick={handleClearData}
            className={`text-xs transition-colors ${confirmClear ? "text-red-400" : "text-muted-foreground/50 hover:text-red-400/70"}`}
          >
            {confirmClear ? "Confirm clear" : "Clear data"}
          </button>
          {confirmClear && (
            <button onClick={() => setConfirmClear(false)} className="text-xs text-muted-foreground/40 hover:text-muted-foreground">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* About */}
      <SettingsCard title="About">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#fafafa]">Cadence</span>
            <Badge variant="secondary" className="font-mono text-[10px]">
              v1.0
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Your data stays on your device.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
