"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useGun } from "@/lib/gun/gun-provider";
import { useProfile } from "@/lib/hooks/use-profile";
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder";
import { CheckinResult, type HabitMatch, type HabitDecision } from "./checkin-result";
import { todayKey } from "@/lib/utils/dates";
import type { Habit } from "@/lib/types";

type DrawerState = "input" | "loading" | "result";
type VoiceState = "idle" | "recording" | "transcribing" | "done";

interface CheckinDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: Habit[];
  dateKey: string;
}

export function CheckinDrawer({ open, onOpenChange, habits, dateKey }: CheckinDrawerProps) {
  const gun = useGun();
  const { profile } = useProfile();
  const { isRecording, isSupported, startRecording, stopRecording } = useVoiceRecorder();

  const [state, setState] = useState<DrawerState>("input");
  const [text, setText] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [matches, setMatches] = useState<HabitMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [justTranscribed, setJustTranscribed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasApiKey = !!profile.aiKey;
  const showMic = hasApiKey && isSupported;

  useEffect(() => {
    if (!open) {
      setState("input");
      setText("");
      setMatches([]);
      setError(null);
      setVoiceState("idle");
      setJustTranscribed(false);
    }
  }, [open]);

  const handleCheckin = useCallback(async () => {
    if (!text.trim() || !profile.aiKey) return;

    setState("loading");
    setError(null);

    try {
      const res = await fetch(`/api/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: profile.aiKey,
          text: text.trim(),
          habits: habits.map((h) => ({
            id: h.id,
            name: h.name,
            emoji: h.emoji,
            floor: h.floor || "",
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Check-in failed (${res.status})`);
      }

      const data = await res.json();
      const { completed = [], uncertain = [], notCompleted = [] } = data;

      const matchMap = new Map<string, HabitDecision>();
      for (const id of completed) matchMap.set(id, "completed");
      for (const id of uncertain) matchMap.set(id, "unresolved");
      for (const id of notCompleted) matchMap.set(id, "notCompleted");

      const ordered: HabitMatch[] = habits.map((h) => ({
        habit: h,
        decision: matchMap.get(h.id) ?? "unresolved",
      }));

      ordered.sort((a, b) => {
        const order: Record<HabitDecision, number> = { completed: 0, unresolved: 1, uncertain: 1, notCompleted: 2 };
        return order[a.decision] - order[b.decision];
      });

      setMatches(ordered);
      setState("result");
    } catch (err) {
      setError("Something went wrong, try again");
      setState("input");
    }
  }, [text, profile.aiKey, habits]);

  const handleToggle = useCallback((habitId: string) => {
    setMatches((prev) =>
      prev.map((m) => {
        if (m.habit.id !== habitId) return m;
        if (m.decision === "completed") return { ...m, decision: "notCompleted" as const };
        if (m.decision === "notCompleted") return { ...m, decision: "completed" as const };
        if (m.decision === "unresolved") return { ...m, decision: "completed" as const };
        if (m.decision === "uncertain") return { ...m, decision: "notCompleted" as const };
        return m;
      })
    );
  }, []);

  const handleApply = useCallback(() => {
    if (!gun) return;

    const isRetroactive = dateKey !== todayKey();
    const toComplete = matches.filter((m) => m.decision === "completed" || m.decision === "uncertain");

    for (const m of toComplete) {
      gun.get("logs").get(dateKey).get(m.habit.id).put({
        done: true,
        friction: null,
        retroactive: isRetroactive,
        completedAt: Date.now(),
      });
    }

    onOpenChange(false);
  }, [gun, dateKey, matches, onOpenChange]);

  const handleVoiceTap = useCallback(async () => {
    if (voiceState === "transcribing") return;

    if (isRecording) {
      const blob = await stopRecording();
      if (!blob || blob.size === 0) { setVoiceState("idle"); return; }

      setVoiceState("transcribing");
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        formData.append("apiKey", profile.aiKey ?? "");

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`/api/transcribe`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error("Transcription failed");
        const data = await res.json();
        const transcribed = data.text?.trim() ?? "";

        if (transcribed) {
          setText((prev) => prev ? `${prev} ${transcribed}` : transcribed);
          setJustTranscribed(true);
          setTimeout(() => setJustTranscribed(false), 2000);
          setVoiceState("done");
          setTimeout(() => setVoiceState("idle"), 1500);
        } else {
          setVoiceState("idle");
        }
      } catch {
        setVoiceState("idle");
      }
    } else {
      await startRecording();
      setVoiceState("recording");
    }
  }, [isRecording, voiceState, stopRecording, startRecording, profile.aiKey]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-[#141414] border-[#262626] max-h-[85dvh]">
        <div className="mx-auto w-full max-w-md pb-8">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">Check in</DrawerTitle>
          </DrawerHeader>

          <div className="px-4">
            <AnimatePresence mode="wait">
              {/* Recording state — full takeover */}
              {state === "input" && (voiceState === "recording" || voiceState === "transcribing") && (
                <motion.div
                  key="recording"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-[140px] gap-4"
                >
                  {voiceState === "recording" ? (
                    <>
                      {/* Large mic button */}
                      <motion.button
                        onClick={handleVoiceTap}
                        className="w-20 h-20 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)" }}
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <div className="w-6 h-6 rounded-sm" style={{ backgroundColor: "var(--primary)" }} />
                      </motion.button>
                      <motion.p
                        className="text-sm text-muted-foreground"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        Listening... tap to stop
                      </motion.p>
                    </>
                  ) : (
                    <>
                      {/* Animated waveform bars */}
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1 rounded-full"
                            style={{ backgroundColor: "var(--primary)" }}
                            animate={{
                              height: ["12px", "28px", "12px"],
                              opacity: [0.4, 1, 0.4],
                            }}
                            transition={{
                              duration: 0.8,
                              repeat: Infinity,
                              delay: i * 0.12,
                              ease: "easeInOut",
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground/60">Processing voice...</p>
                    </>
                  )}
                </motion.div>
              )}

              {/* Normal input state */}
              {state === "input" && voiceState !== "recording" && voiceState !== "transcribing" && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    What did you do today?
                  </p>

                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={text}
                      onChange={(e) => { setText(e.target.value); setJustTranscribed(false); }}
                      onKeyDown={(e) => e.key === "Enter" && handleCheckin()}
                      placeholder="ran, meditated, read a chapter..."
                      className="bg-[#1a1a1a] border-[#262626] text-foreground h-11 flex-1"
                    />
                    {showMic && (
                      <motion.button
                        onClick={handleVoiceTap}
                        className="w-11 h-11 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        whileTap={{ scale: 0.92 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" x2="12" y1="19" y2="22" />
                        </svg>
                      </motion.button>
                    )}
                  </div>

                  {error && (
                    <p className="text-xs text-red-400">{error}</p>
                  )}

                  <motion.button
                    onClick={handleCheckin}
                    disabled={!text.trim()}
                    className="w-full py-3 bg-foreground text-background rounded-xl font-semibold text-sm hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    animate={justTranscribed ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    Check in {"→"}
                  </motion.button>
                </motion.div>
              )}

              {state === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Analyzing...</p>
                </motion.div>
              )}

              {state === "result" && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <CheckinResult
                    matches={matches}
                    onToggle={handleToggle}
                    onApply={handleApply}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
