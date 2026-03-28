"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useReflections, getISOWeekKey } from "@/lib/hooks/use-reflections";

interface Message {
  role: "user" | "model";
  content: string;
}

interface WeekSummary {
  habits: { name: string; emoji: string; frequency: string }[];
  days: { date: string; completions: { habitName: string; done: boolean; friction: number | null }[] }[];
  overallCompletion: number;
  streaks: Record<string, number>;
  frictionAlerts: string[];
  journalEntries?: { date: string; text: string; mood: string | null }[];
}

interface ReflectionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekSummary: WeekSummary | null;
  apiKey?: string;
}

const GEMINI_MODEL = "gemini-2.5-flash";

export function ReflectionDrawer({
  open,
  onOpenChange,
  weekSummary,
  apiKey = "",
}: ReflectionDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const { pastWeeks, pastWeekKeys, saveSummary } = useReflections();
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [patternDraft, setPatternDraft] = useState("");
  const [patternSaved, setPatternSaved] = useState(false);
  const currentWeekKey = getISOWeekKey(new Date());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (open && weekSummary && !initialized.current && apiKey) {
      initialized.current = true;
      setShowSavePrompt(false);
      setPatternSaved(false);
      sendMessage("Reflect on my week.", true);
    }
    if (!open) {
      initialized.current = false;
      setMessages([]);
      setStreamingText("");
      setShowSavePrompt(false);
      setPatternDraft("");
      setPatternSaved(false);
    }
  }, [open, weekSummary, apiKey]);

  const extractPattern = useCallback(
    async (conversationMessages: Message[]) => {
      if (!apiKey) return;

      try {
        const extractPrompt = `You are analyzing a habit reflection conversation. Extract 1-3 specific behavioral patterns from this conversation. Avoid general advice. Use concrete phrasing tied to habits. Return ONLY the patterns as a single short paragraph (max 200 chars total). No bullet points, no intro text.

Conversation:
${conversationMessages.map((m) => `${m.role === "user" ? "User" : "Coach"}: ${m.content}`).join("\n")}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: extractPrompt }] }],
            generationConfig: { maxOutputTokens: 256, temperature: 0.3 },
          }),
        });

        if (!res.ok) return;
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          setPatternDraft(text.slice(0, 200));
          setShowSavePrompt(true);
        }
      } catch {
      }
    },
    [apiKey]
  );

  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && messages.length >= 2 && !patternSaved && !showSavePrompt) {
        extractPattern(messages);
        return;
      }
      onOpenChange(nextOpen);
    },
    [messages, patternSaved, showSavePrompt, extractPattern, onOpenChange]
  );

  const handleSavePattern = () => {
    if (patternDraft.trim()) {
      saveSummary(currentWeekKey, patternDraft.trim());
    }
    setPatternSaved(true);
    setShowSavePrompt(false);
    onOpenChange(false);
  };

  const handleSkipPattern = () => {
    setPatternSaved(true);
    setShowSavePrompt(false);
    onOpenChange(false);
  };

  const sendMessage = useCallback(
    async (text: string, isInitial = false) => {
      if (!apiKey || !weekSummary) {
        setMessages((prev) => [
          ...prev,
          { role: "model", content: "Add your Gemini API key in Settings to use reflections." },
        ]);
        return;
      }

      if (!isInitial) {
        setMessages((prev) => [...prev, { role: "user", content: text }]);
      }
      setLoading(true);
      setStreamingText("");

      try {
        const systemPrompt = buildSystemPrompt(weekSummary, pastWeeks, pastWeekKeys);
        const history = isInitial
          ? []
          : messages.map((m) => ({
              role: m.role,
              parts: [{ text: m.content }],
            }));

        const requestBody = {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...history,
            { role: "user", parts: [{ text }] },
          ],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        };

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini API error: ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullText += text;
                  setStreamingText(fullText);
                }
              } catch {
              }
            }
          }
        }

        setStreamingText("");
        setMessages((prev) => [...prev, { role: "model", content: fullText }]);
      } catch (err) {
        setStreamingText("");
        setMessages((prev) => [
          ...prev,
          { role: "model", content: `Error: ${err instanceof Error ? err.message : "Connection failed"}` },
        ]);
      }

      setLoading(false);
    },
    [apiKey, weekSummary, messages, pastWeeks, pastWeekKeys]
  );

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const displayMessages = streamingText
    ? [...messages, { role: "model" as const, content: streamingText }]
    : messages;

  return (
    <Drawer open={open} onOpenChange={handleClose}>
      <DrawerContent className="bg-[#141414] border-[#262626] h-[85svh]">
        <DrawerHeader>
          <DrawerTitle className="text-foreground">Weekly Reflection</DrawerTitle>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-3 pb-4">
          {displayMessages.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {apiKey
                ? "Starting your weekly reflection..."
                : "Add a Gemini API key in Settings to start."}
            </p>
          )}
          {displayMessages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                msg.role === "user"
                  ? "ml-auto bg-foreground text-background"
                  : "bg-[#1a1a1a] text-foreground"
              )}
            >
              {msg.content}
              {/* Streaming cursor */}
              {streamingText && i === displayMessages.length - 1 && msg.role === "model" && (
                <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse" />
              )}
            </div>
          ))}
          {loading && displayMessages.length === 0 && (
            <div className="bg-[#1a1a1a] px-4 py-3 rounded-2xl max-w-[85%]">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Save pattern prompt */}
          {showSavePrompt && (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl px-4 py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Save a pattern from this reflection?
              </p>
              <textarea
                value={patternDraft}
                onChange={(e) => setPatternDraft(e.target.value.slice(0, 200))}
                className="w-full bg-[#0f0f0f] border border-[#333] rounded-lg px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-[#555]"
                rows={3}
                maxLength={200}
                placeholder="e.g. skips journal when mornings are rushed"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {patternDraft.length}/200
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleSkipPattern}
                    className="px-4 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleSavePattern}
                    disabled={!patternDraft.trim()}
                    className="px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-30 transition-opacity"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {!showSavePrompt && (
          <div className="px-4 pb-6 pt-2 border-t border-[#262626]">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Reply..."
                className="bg-[#1a1a1a] border-[#262626] text-foreground h-11 flex-1"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-11 h-11 rounded-xl bg-foreground text-background flex items-center justify-center disabled:opacity-30 shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

function buildSystemPrompt(
  weekData: WeekSummary,
  pastWeeks: { summary: string; date: number }[],
  pastWeekKeys: string[]
): string {
  const summary = weekData.days
    .map((d) => {
      const done = d.completions.filter((c) => c.done).length;
      const total = d.completions.length;
      return `${d.date}: ${done}/${total}`;
    })
    .join(", ");

  const frictionNote = weekData.frictionAlerts.length > 0
    ? `\nHabits with sustained high friction: ${weekData.frictionAlerts.join(", ")}`
    : "";

  const journalEntries = (weekData.journalEntries ?? [])
    .filter((j) => j.text?.trim());
  const journalNote = journalEntries.length
    ? `\n\nJournal entries this week:\n${journalEntries
        .map((j) => `  ${j.date}: "${j.text.slice(0, 200)}"${j.mood ? ` (mood: ${j.mood})` : ""}`)
        .join("\n")}`
    : "";

  let pastPatternsNote = "";
  if (pastWeeks.length > 0) {
    const patternLines = pastWeeks.map((pw, i) => {
      const weekKey = pastWeekKeys[i];
      const truncated = pw.summary.slice(0, 200);
      return `  ${weekKey}: "${truncated}"`;
    });
    pastPatternsNote = `\n\nPast patterns:\n${patternLines.join("\n")}`;
  }

  return `You are Cadence, a calm and direct habit coach doing a weekly reflection.

Week data — overall: ${weekData.overallCompletion}% completion
Daily: ${summary}${frictionNote}${journalNote}${pastPatternsNote}

Rules:
- Be concise and conversational. 2-3 short paragraphs max.
- Surface what's working and what isn't.
- If something has been hard for days, suggest shrinking or moving it.
- If a habit has 0 completions, ask about it.
- Reference journal entries when they reveal patterns or insights.
- Reference past patterns if relevant. Note if this week shows the same issue.
- At most 2-3 actionable suggestions.
- End with one genuine encouragement.
- This is a conversation — ask follow-up questions, don't just lecture.`;
}
