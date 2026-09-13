"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Bundle } from "@/lib/hooks/use-bundles";
import { useSharedData } from "@/lib/gun/data-provider";
import {
  SheetAddRow,
  SheetGroupLabel,
  SheetPrimaryButton,
  SheetSecondaryButton,
} from "./settings-row";
import { Trash2, Check } from "lucide-react";

interface BundleEditorProps {
  bundles: Record<string, Bundle>;
  createBundle: (name: string, habitIds: string[]) => void;
  deleteBundle: (id: string) => void;
  loading?: boolean;
}

export function BundleEditor({
  bundles,
  createBundle,
  deleteBundle,
  loading,
}: BundleEditorProps) {
  const { habits: rawHabits } = useSharedData();

  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);

  const activeHabits = Object.values(rawHabits).filter((h) => !h.archived);
  const bundleList = Object.values(bundles);
  const atLimit = bundleList.length >= 3;

  const toggleHabit = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed || selectedIds.size === 0 || atLimit) return;

    createBundle(trimmed, Array.from(selectedIds));
    setName("");
    setSelectedIds(new Set());
    setShowForm(false);
  };

  const handleCancel = () => {
    setName("");
    setSelectedIds(new Set());
    setShowForm(false);
  };

  if (loading) {
    return <div className="mx-5 h-12 animate-pulse rounded-lg bg-secondary" />;
  }

  return (
    <div>
      <AnimatePresence mode="popLayout">
        {bundleList.map((bundle) => {
          const ids = bundle.habitIds.split(",").filter(Boolean);
          return (
            <motion.div
              key={bundle.id}
              layout
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex min-h-13 items-center gap-3 border-b border-border px-5">
                <div className="min-w-0 flex-1 py-2">
                  <p className="truncate text-body text-foreground">{bundle.name}</p>
                  <p className="truncate text-label text-muted-foreground">
                    {ids.length} habit{ids.length !== 1 ? "s" : ""}
                    {" · "}
                    {ids.map((id) => rawHabits[id]?.name || "Unknown").join(", ")}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${bundle.name}`}
                  onClick={() => deleteBundle(bundle.id)}
                  className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors active:bg-secondary"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {bundleList.length === 0 && !showForm && (
        <div className="mx-5 mb-4 rounded-lg border border-dashed border-surface-3 px-4 py-5 text-center">
          <p className="text-label text-muted-foreground">
            No bundles yet. A bundle like &ldquo;Morning routine&rdquo; lets you tick
            Meditate, Exercise and Journal together from the Habits tab.
          </p>
        </div>
      )}

      {!showForm && !atLimit && (
        <div className="pt-3">
          <SheetAddRow label="New bundle" onClick={() => setShowForm(true)} />
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <SheetGroupLabel>New bundle</SheetGroupLabel>

            <div className="px-5 pb-3">
              <label className="mb-2 block text-micro text-ink-3" htmlFor="bundle-name">
                Name
              </label>
              <input
                id="bundle-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning routine"
                maxLength={40}
                className="w-full rounded-sm border border-border bg-background px-3 py-3 text-body text-foreground transition-colors outline-none placeholder:text-ink-3 focus:border-surface-3"
              />
            </div>

            <p className="px-5 pb-1 text-micro text-ink-3">Include these habits</p>

            {activeHabits.map((habit) => {
              const checked = selectedIds.has(habit.id);
              return (
                <button
                  key={habit.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleHabit(habit.id)}
                  className="flex min-h-12 w-full items-center gap-3 px-5 text-left transition-colors active:bg-secondary"
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-sm border-2 transition-colors ${
                      checked
                        ? "border-foreground bg-foreground text-background"
                        : "border-surface-3 bg-transparent"
                    }`}
                  >
                    {checked && <Check className="size-3.5" strokeWidth={3.4} />}
                  </span>
                  <span className="truncate text-body text-foreground">{habit.name}</span>
                </button>
              );
            })}

            <div className="flex gap-2 px-5 pt-4">
              <SheetPrimaryButton
                onClick={handleSave}
                disabled={!name.trim() || selectedIds.size === 0}
              >
                Save bundle
              </SheetPrimaryButton>
              <SheetSecondaryButton onClick={handleCancel}>Cancel</SheetSecondaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {atLimit && !showForm && (
        <p className="px-5 pt-3 text-label text-muted-foreground">
          Maximum of 3 bundles reached. Delete one to create a new bundle.
        </p>
      )}
    </div>
  );
}
