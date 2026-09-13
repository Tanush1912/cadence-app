"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useJournal } from "@/lib/hooks/use-journal";
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder";
import { useProfile } from "@/lib/hooks/use-profile";
import { extractTags } from "@/lib/utils/tags";
import { VoiceButton } from "./voice-button";
import { MoodPicker } from "./mood-picker";
import type { Mood } from "@/lib/types";

type VoiceState = "idle" | "recording" | "transcribing" | "done";

const TRANSCRIBE_TIMEOUT_MS = 8000;
const MAX_RECORDING_MS = 20000;

export function JournalCard({ dateKey }: { dateKey: string }) {
  const { entry, saveEntry, setMood } = useJournal(dateKey);
  const { profile } = useProfile();
  const { isRecording, isSupported, startRecording, stopRecording, error: recorderError } = useVoiceRecorder();

  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [showMood, setShowMood] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEditingRef = useRef(false);
  const lastTranscriptRef = useRef<string>("");

  const hasApiKey = !!profile.aiKey;
  const showMic = hasApiKey && isSupported;

  const prevDateRef = useRef(dateKey);
  useEffect(() => {
    if (prevDateRef.current !== dateKey) {
      prevDateRef.current = dateKey;
      isEditingRef.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setText("");
      setShowMood(false);
      setExpanded(false);
      setVoiceState("idle");
      setTranscribeError(null);
      lastTranscriptRef.current = "";
    }
  }, [dateKey]);

  useEffect(() => {
    if (!isEditingRef.current) {
      setText(entry?.text ?? "");
    }
    if (entry?.mood) setShowMood(true);
    // Collapse evening auto-expand if entry already has content
    if (entry?.text || entry?.mood) {
      const hour = new Date().getHours();
      if (hour >= 18 && !isEditingRef.current) {
        setExpanded(false);
      }
    }
  }, [entry?.text, entry?.mood]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [text]);

  const scheduleSave = useCallback(
    (value: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveEntry(value);
      }, 1000);
    },
    [saveEntry]
  );

  const handleTextChange = useCallback(
    (value: string) => {
      isEditingRef.current = true;
      setText(value);
      setTranscribeError(null);
      scheduleSave(value);
    },
    [scheduleSave]
  );

  const handleFocus = useCallback(() => {
    isEditingRef.current = true;
  }, []);

  const handleBlur = useCallback(() => {
    isEditingRef.current = false;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (text !== (entry?.text ?? "")) {
      saveEntry(text);
    }
  }, [text, entry?.text, saveEntry]);

  const moveCursorToEnd = useCallback(() => {
    if (textareaRef.current) {
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
      textareaRef.current.focus();
    }
  }, []);

  const appendTranscribed = useCallback(
    (transcribed: string) => {
      if (transcribed === lastTranscriptRef.current) return;
      lastTranscriptRef.current = transcribed;

      if (saveTimer.current) clearTimeout(saveTimer.current);

      setText((prev) => {
        const combined = prev.trim() ? `${prev.trim()}\n${transcribed}` : transcribed;
        saveEntry(combined);
        return combined;
      });

      requestAnimationFrame(moveCursorToEnd);
    },
    [saveEntry, moveCursorToEnd]
  );

  const handleVoiceTap = useCallback(async () => {
    if (voiceState === "transcribing") return;

    if (isRecording) {
      const blob = await stopRecording();
      if (!blob || blob.size === 0) {
        setVoiceState("idle");
        return;
      }

      setVoiceState("transcribing");
      try {
        const transcribed = await transcribeAudio(blob, profile.aiKey ?? "");
        if (transcribed) {
          appendTranscribed(transcribed);
          setVoiceState("done");
          setTimeout(() => setVoiceState("idle"), 2000);
        } else {
          setVoiceState("idle");
        }
      } catch (err) {
        setTranscribeError("Couldn't transcribe, try again");
        setVoiceState("idle");
      }
    } else {
      setTranscribeError(null);
      lastTranscriptRef.current = "";
      await startRecording();
      setVoiceState("recording");
    }
  }, [isRecording, voiceState, stopRecording, startRecording, appendTranscribed, profile.aiKey]);

  const [debouncedText, setDebouncedText] = useState(text);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedText(text), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const tags = useMemo(() => extractTags(debouncedText), [debouncedText]);

  const hasContent = !!(entry?.text || entry?.mood);

  return (
    <div className="mt-2">
      <AnimatePresence>
        {!expanded ? (
          <motion.button
            key="collapsed"
            onClick={() => setExpanded(true)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-colors text-left",
              "bg-[#0e0e0e] border-[#181818] hover:border-[#222222]"
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="text-muted-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
              </svg>
            </span>
            {hasContent ? (
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {entry?.mood && (
                  <span className="text-xs shrink-0">
                    {MOOD_EMOJI[entry.mood]}
                  </span>
                )}
                <span className="text-sm text-muted-foreground truncate">
                  {entry?.text || "No text"}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground/40">
                How was today?
              </span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            className="bg-[#0e0e0e] rounded-2xl border border-[#181818] overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Header */}
            <button
              onClick={() => { handleBlur(); setExpanded(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Journal</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>

            {/* Textarea + mic */}
            <div className="px-4 pb-2 relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="write a quick note (or speak)"
                rows={2}
                className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/40 resize-none outline-none pr-10"
                style={{ minHeight: "48px", maxHeight: "144px" }}
              />
              {showMic && (
                <div className="absolute right-4 bottom-2">
                  <VoiceButton state={voiceState} onTap={handleVoiceTap} />
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] text-violet-400/70 bg-violet-400/10 rounded-full px-2 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Errors */}
            {(transcribeError || recorderError) && (
              <p className="px-4 pb-2 text-[10px] text-red-400">
                {transcribeError || recorderError}
              </p>
            )}

            {/* Footer: mood toggle + character count */}
            <div className="px-4 pb-3 flex items-center justify-between">
              {showMood ? (
                <MoodPicker selected={entry?.mood ?? null} onSelect={setMood} />
              ) : (
                <button
                  onClick={() => setShowMood(true)}
                  className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                >
                  + add mood
                </button>
              )}
              <span className="text-[10px] text-muted-foreground/30 font-mono">
                {text.length}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MOOD_EMOJI: Record<string, string> = {
  great: "\u{1F60A}",
  good: "\u{1F642}",
  okay: "\u{1F610}",
  rough: "\u{1F614}",
  bad: "\u{1F61E}",
};

async function transcribeAudio(blob: Blob, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("audio", blob, "recording.webm");
  formData.append("apiKey", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

  try {
    const res = await fetch(`/api/transcribe`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Transcription failed (${res.status})`);
    }

    const data = await res.json();
    return data.text?.trim() ?? "";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Transcription timed out, try a shorter recording");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
