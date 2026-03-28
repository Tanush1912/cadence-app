"use client";

import { useState } from "react";
import { useReminders } from "@/lib/hooks/use-reminders";
import { SettingsCard } from "./settings-card";

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export function ReminderSettings() {
  const {
    enabled,
    hour,
    isSupported,
    permissionGranted,
    loading,
    enableReminders,
    disableReminders,
    testNotification,
  } = useReminders();

  const [selectedHour, setSelectedHour] = useState(hour);
  const [showTimePicker, setShowTimePicker] = useState(false);

  if (!isSupported) return null;
  if (loading) return null;

  if (enabled) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#141414] rounded-full border border-[#262626]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
          <span className="text-sm text-muted-foreground">
            Reminder at {formatHour(hour)}
          </span>
        </div>
        <button
          onClick={disableReminders}
          className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <SettingsCard title="Reminders">
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Get a daily nudge to log your habits.
          {!permissionGranted && " You'll be asked to allow notifications."}
        </p>

        {showTimePicker ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Time</label>
                <span className="text-sm font-mono font-medium" style={{ color: "var(--primary)" }}>
                  {formatHour(selectedHour)}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="23"
                step="1"
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#262626] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#fafafa]"
              />
              <div className="flex justify-between text-[10px] text-[#404040]">
                <span>5 AM</span>
                <span>11 PM</span>
              </div>
            </div>
            <button
              onClick={() => enableReminders(selectedHour, 0)}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-[#0a0a0a] transition-colors"
              style={{ backgroundColor: "var(--primary)" }}
            >
              Enable reminder
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTimePicker(true)}
            className="w-full py-2.5 bg-[#1a1a1a] rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Set up daily reminder
          </button>
        )}
      </div>
    </SettingsCard>
  );
}
