import { Hono } from "hono";
import { callGemini } from "../lib/gemini.js";

interface Habit {
  id: string;
  name: string;
  emoji: string;
  floor: string;
}

interface CheckinRequest {
  apiKey: string;
  text: string;
  habits: Habit[];
}

interface ClassificationResult {
  completed: string[];
  uncertain: string[];
  notCompleted: string[];
}

function buildPrompt(habits: Habit[], text: string): string {
  const habitLines = habits
    .map((h) => `- ${h.id}: ${h.emoji} ${h.name} (floor: ${h.floor})`)
    .join("\n");

  return `You are a habit classifier. Given the user's description of their day and a list of habits, classify each habit.

Habits:
${habitLines}

User said: "${text}"

Rules:
- Explicitly mentioned doing it → completed
- Explicitly said they skipped/didn't do it → notCompleted
- Not mentioned or ambiguous → uncertain
- Map user language flexibly: "gym" = exercise, "smoothie" = healthy breakfast, "stretched" = exercise, etc.
- Return ONLY valid JSON, nothing else

Output format:
{"completed":["h1","h2"],"uncertain":["h3"],"notCompleted":["h4"]}`;
}

function stripCodeFences(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return cleaned.trim();
}

const checkin = new Hono();

checkin.post("/", async (c) => {
  let body: CheckinRequest;

  try {
    body = await c.req.json<CheckinRequest>();
  } catch {
    return c.json({ error: "Invalid JSON body." }, 400);
  }

  if (!body.apiKey || typeof body.apiKey !== "string" || body.apiKey.trim() === "") {
    return c.json({ error: "API key is required." }, 400);
  }

  if (!body.text || typeof body.text !== "string" || body.text.trim() === "") {
    return c.json({ error: "Check-in text is required." }, 400);
  }

  if (!Array.isArray(body.habits) || body.habits.length === 0) {
    return c.json({ error: "Habits array is required and must not be empty." }, 400);
  }

  const allHabitIds = body.habits.map((h) => h.id);
  const prompt = buildPrompt(body.habits, body.text);

  try {
    const rawResponse = await callGemini({
      apiKey: body.apiKey,
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 256,
      },
    });

    const cleaned = stripCodeFences(rawResponse);

    let result: ClassificationResult;
    try {
      result = JSON.parse(cleaned) as ClassificationResult;

      if (!Array.isArray(result.completed)) result.completed = [];
      if (!Array.isArray(result.uncertain)) result.uncertain = [];
      if (!Array.isArray(result.notCompleted)) result.notCompleted = [];
    } catch {
      result = {
        completed: [],
        uncertain: allHabitIds,
        notCompleted: [],
      };
    }

    return c.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error calling Gemini.";
    const status = message.includes("Rate limited")
      ? 429
      : message.includes("Invalid API key")
        ? 401
        : 502;
    return c.json({ error: message }, status);
  }
});

export default checkin;
