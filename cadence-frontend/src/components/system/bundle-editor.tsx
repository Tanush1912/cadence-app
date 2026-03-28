"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBundles } from "@/lib/hooks/use-bundles";
import { useSharedData } from "@/lib/gun/data-provider";

export function BundleEditor() {
  const { bundles, createBundle, deleteBundle, loading } = useBundles();
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
    return (
      <div className="bg-[#141414] rounded-2xl border border-[#262626] p-5">
        <h2 className="text-base font-semibold mb-3">Habit Bundles</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] rounded-2xl border border-[#262626] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Habit Bundles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group habits and complete them together ({bundleList.length}/3)
          </p>
        </div>
        {!showForm && !atLimit && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#262626] text-foreground hover:bg-[#303030] transition-colors"
          >
            + New
          </button>
        )}
      </div>

      {/* Existing bundles */}
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
              className="mb-2"
            >
              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-xl border border-[#262626] px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{bundle.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ids.length} habit{ids.length !== 1 ? "s" : ""} —{" "}
                    {ids
                      .map((id) => rawHabits[id]?.name || "Unknown")
                      .join(", ")}
                  </p>
                </div>
                <button
                  onClick={() => deleteBundle(bundle.id)}
                  className="ml-3 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {bundleList.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No bundles yet. Create one to batch-complete habits.
        </p>
      )}

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-[#262626]">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bundle name (e.g. Morning routine)"
                maxLength={40}
                className="w-full bg-[#0a0a0a] border border-[#262626] rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#404040] transition-colors"
              />

              <p className="text-xs text-muted-foreground mt-3 mb-2">
                Select habits to include:
              </p>

              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {activeHabits.map((habit) => (
                  <label
                    key={habit.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selectedIds.has(habit.id)
                          ? "bg-foreground border-foreground"
                          : "border-[#404040] bg-transparent"
                      }`}
                    >
                      {selectedIds.has(habit.id) && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#0a0a0a"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm">{habit.emoji}</span>
                    <span className="text-sm truncate">{habit.name}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={!name.trim() || selectedIds.size === 0}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-foreground text-background disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  Save Bundle
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[#262626] text-foreground hover:bg-[#303030] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {atLimit && !showForm && (
        <p className="text-xs text-muted-foreground mt-3">
          Maximum of 3 bundles reached. Delete one to create a new bundle.
        </p>
      )}
    </div>
  );
}
