"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useGun } from "@/lib/gun/gun-provider";
import { stripGunMeta } from "@/lib/gun/gun-utils";
import type { JournalEntry, Mood } from "@/lib/types";

export function useJournal(dateKey: string) {
  const gun = useGun();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const lastJson = useRef("");

  useEffect(() => {
    if (!gun || !dateKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const node = gun.get("journal").get(dateKey);

    const handler = (raw: Record<string, unknown> | null) => {
      if (!raw) {
        setEntry(null);
        setLoading(false);
        return;
      }
      const cleaned = stripGunMeta(raw);
      const json = JSON.stringify(cleaned);
      if (json !== lastJson.current) {
        lastJson.current = json;
        setEntry({
          text: (cleaned.text as string) ?? "",
          mood: (cleaned.mood as Mood) ?? null,
          createdAt: (cleaned.createdAt as number) ?? Date.now(),
          updatedAt: (cleaned.updatedAt as number) ?? Date.now(),
        });
      }
      setLoading(false);
    };

    node.on(handler);

    const timeout = setTimeout(() => setLoading(false), 500);

    return () => {
      node.off();
      clearTimeout(timeout);
      lastJson.current = "";
    };
  }, [gun, dateKey]);

  const saveEntry = useCallback(
    (text: string, mood?: Mood) => {
      if (!gun) return;

      const now = Date.now();
      const updated: JournalEntry = {
        text,
        mood: mood ?? entry?.mood ?? null,
        createdAt: entry?.createdAt ?? now,
        updatedAt: now,
      };

      setEntry(updated);
      gun.get("journal").get(dateKey).put({
        text: updated.text,
        mood: updated.mood,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    },
    [gun, dateKey, entry]
  );

  const appendText = useCallback(
    (newText: string) => {
      if (!gun) return;
      const current = entry?.text ?? "";
      const combined = current ? `${current} ${newText}` : newText;
      saveEntry(combined, entry?.mood ?? undefined);
    },
    [gun, entry, saveEntry]
  );

  const setMood = useCallback(
    (mood: Mood) => {
      if (!gun) return;
      const updated: JournalEntry = {
        text: entry?.text ?? "",
        mood,
        createdAt: entry?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      setEntry(updated);
      gun.get("journal").get(dateKey).put({
        text: updated.text,
        mood: updated.mood,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      });
    },
    [gun, dateKey, entry]
  );

  return { entry, loading, saveEntry, appendText, setMood };
}
