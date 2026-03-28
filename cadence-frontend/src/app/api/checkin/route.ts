import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

interface Habit {
  id: string;
  name: string;
  emoji: string;
  floor: string;
}

function buildPrompt(habits: Habit[], text: string): string {
  const habitLines = habits
    .map((h) => `- ${h.id}: ${h.name} (floor: ${h.floor || "none"})`)
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
  return text.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export async function POST(req: NextRequest) {
  let body: { apiKey: string; text: string; habits: Habit[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.apiKey?.trim()) {
    return NextResponse.json({ error: "API key is required." }, { status: 400 });
  }
  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Check-in text is required." }, { status: 400 });
  }
  if (!Array.isArray(body.habits) || body.habits.length === 0) {
    return NextResponse.json({ error: "Habits array required." }, { status: 400 });
  }

  const allHabitIds = body.habits.map((h) => h.id);
  const prompt = buildPrompt(body.habits, body.text);

  try {
    const rawResponse = await callGemini({
      apiKey: body.apiKey.trim(),
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: 256 },
    });

    const cleaned = stripCodeFences(rawResponse);

    let result: { completed: string[]; uncertain: string[]; notCompleted: string[] };
    try {
      result = JSON.parse(cleaned);
      if (!Array.isArray(result.completed)) result.completed = [];
      if (!Array.isArray(result.uncertain)) result.uncertain = [];
      if (!Array.isArray(result.notCompleted)) result.notCompleted = [];
    } catch {
      result = { completed: [], uncertain: allHabitIds, notCompleted: [] };
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Check-in failed" }, { status: 502 });
  }
}
