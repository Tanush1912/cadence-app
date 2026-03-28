import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const audio = formData.get("audio");
  const apiKey = formData.get("apiKey");

  if (!audio || !(audio instanceof File)) {
    return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    return NextResponse.json({ error: "API key is required." }, { status: 400 });
  }

  const mimeType = audio.type || "audio/webm";
  const arrayBuffer = await audio.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  try {
    const text = await callGemini({
      apiKey: apiKey.trim(),
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: "Transcribe this audio into clean, readable text. Remove filler words (uh, um, like). Add natural punctuation. Do not summarize or change meaning. If the audio is silent or inaudible, respond with an empty string only — no brackets, no explanation." },
          ],
        },
      ],
      generationConfig: { temperature: 0, maxOutputTokens: 512 },
    });

    const cleaned = text.trim();
    const junkPatterns = /^\[.*\]$|no audible|no speech|inaudible|silence/i;
    if (!cleaned || junkPatterns.test(cleaned)) {
      return NextResponse.json({ text: "" });
    }

    return NextResponse.json({ text: cleaned });
  } catch {
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }
}
