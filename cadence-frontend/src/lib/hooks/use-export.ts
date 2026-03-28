"use client";

import { useCallback } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { stripGunMeta } from "@/lib/gun/gun-utils";
import { FRICTION_LABELS } from "@/lib/constants";
import { fromDateKey } from "@/lib/utils/dates";
import type { Habit, Log, FrictionScore } from "@/lib/types";

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useExport() {
  const gun = useGun();

  const collectData = useCallback((): Promise<{
    habits: Record<string, Habit>;
    logs: Record<string, Record<string, Log>>;
    profile: Record<string, unknown>;
  }> => {
    return new Promise((resolve) => {
      if (!gun) {
        resolve({ habits: {}, logs: {}, profile: {} });
        return;
      }

      const result = {
        habits: {} as Record<string, Habit>,
        logs: {} as Record<string, Record<string, Log>>,
        profile: {} as Record<string, unknown>,
      };

      let pending = 3;
      const done = () => {
        pending--;
        if (pending === 0) resolve(result);
      };

      gun.get("habits").map().once((raw: Record<string, unknown> | null, id: string) => {
        if (raw) {
          const cleaned = stripGunMeta(raw) as unknown as Habit;
          result.habits[id] = { ...cleaned, id };
        }
      });
      setTimeout(done, 1000);

      gun.get("logs").map().once((dayData: Record<string, unknown> | null, dateKey: string) => {
        if (!dayData) return;
        const cleaned = stripGunMeta(dayData);
        const dayLogs: Record<string, Log> = {};
        for (const [habitId, logData] of Object.entries(cleaned)) {
          if (habitId === "_" || typeof logData !== "object" || !logData) continue;
          const log = stripGunMeta(logData as Record<string, unknown>);
          dayLogs[habitId] = {
            done: !!log.done,
            friction: (log.friction as FrictionScore) ?? null,
            retroactive: !!log.retroactive,
            completedAt: (log.completedAt as number) ?? null,
          };
        }
        if (Object.keys(dayLogs).length > 0) {
          result.logs[dateKey] = dayLogs;
        }
      });
      setTimeout(done, 1000);

      gun.get("profile").once((raw: Record<string, unknown> | null) => {
        if (raw) {
          result.profile = stripGunMeta(raw);
        }
      });
      setTimeout(done, 1000);
    });
  }, [gun]);

  const exportJSON = useCallback(async () => {
    const data = await collectData();
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(`cadence-export-${date}.json`, json, "application/json");
  }, [collectData]);

  const exportMarkdown = useCallback(async () => {
    const data = await collectData();
    const habitMap = data.habits;
    const sortedDates = Object.keys(data.logs).sort().reverse();

    const lines: string[] = ["# Cadence Export", ""];

    for (const dateKey of sortedDates) {
      const date = fromDateKey(dateKey);
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      lines.push(`## ${dateKey} (${dayName})`);

      const dayLogs = data.logs[dateKey];
      let completed = 0;
      let total = 0;

      for (const [habitId, log] of Object.entries(dayLogs)) {
        const habit = habitMap[habitId];
        if (!habit) continue;
        total++;
        const check = log.done ? "x" : " ";
        const frictionLabel =
          log.friction && log.friction in FRICTION_LABELS
            ? ` (${FRICTION_LABELS[log.friction as 1 | 2 | 3]})`
            : "";
        lines.push(`- [${check}] ${habit.emoji} ${habit.name}${frictionLabel}`);
        if (log.done) completed++;
      }

      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      lines.push(`\ncompletion: ${completed}/${total} (${pct}%)`);
      lines.push("");
    }

    const date = new Date().toISOString().slice(0, 10);
    triggerDownload(`cadence-export-${date}.md`, lines.join("\n"), "text/markdown");
  }, [collectData]);

  return { exportJSON, exportMarkdown };
}
