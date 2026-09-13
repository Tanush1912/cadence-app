"use client";

import { useState } from "react";
import { useReminders } from "@/lib/hooks/use-reminders";
import { SettingsSheet } from "./settings-sheet";
import { SettingsAction, SettingsSlider, SheetPrimaryButton } from "./settings-row";

function formatTime(hour: number, minute = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function ReminderSettings() {
  const {
    enabled,
    hour,
    minute,
    isSupported,
    permissionGranted,
    loading,
    enableReminders,
    disableReminders,
  } = useReminders();

  const [selectedHour, setSelectedHour] = useState(hour);
  const [open, setOpen] = useState(false);

  if (!isSupported) return null;
  if (loading) return null;

  return (
    <>
      <SettingsAction
        label="Reminder"
        value={enabled ? formatTime(hour, minute) : "Off"}
        onClick={() => {
          setSelectedHour(hour);
          setOpen(true);
        }}
      />

      <SettingsSheet
        open={open}
        onOpenChange={setOpen}
        title="Reminder"
        description={`Get a daily nudge to log your habits.${
          permissionGranted ? "" : " You will be asked to allow notifications."
        }`}
      >
        <div className="px-5">
          <div className="flex items-center justify-between">
            <span className="text-body text-foreground">Time</span>
            <span className="font-mono text-label text-primary">
              {formatTime(selectedHour)}
            </span>
          </div>
          <SettingsSlider
            label="Reminder time"
            min={5}
            max={23}
            step={1}
            value={selectedHour}
            onChange={(e) => setSelectedHour(parseInt(e.target.value, 10))}
          />
        </div>

        <div className="flex px-5 pt-2">
          <SheetPrimaryButton
            onClick={() => {
              enableReminders(selectedHour, 0);
              setOpen(false);
            }}
          >
            {enabled ? "Update reminder" : "Enable reminder"}
          </SheetPrimaryButton>
        </div>

        {enabled && (
          <div className="px-5 pt-2">
            <button
              type="button"
              onClick={() => {
                disableReminders();
                setOpen(false);
              }}
              className="flex min-h-11 w-full items-center justify-center text-body text-destructive"
            >
              Turn off reminder
            </button>
          </div>
        )}
      </SettingsSheet>
    </>
  );
}
