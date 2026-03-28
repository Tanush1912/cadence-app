import { Hono } from "hono";
import { callGemini } from "../lib/gemini.js";

const transcribe = new Hono();

transcribe.post("/", async (c) => {
  const formData = await c.req.formData();

  const audio = formData.get("audio");
  const apiKey = formData.get("apiKey");

  if (!audio || !(audio instanceof File)) {
    return c.json({ error: "No audio file provided." }, 400);
  }

  if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
    return c.json({ error: "API key is required." }, 400);
  }

  const keyStr = apiKey.toString().trim();
  console.log(`[transcribe] Key length: ${keyStr.length}, starts with: ${keyStr.slice(0, 4)}...`);

  const mimeType = audio.type || "audio/webm";
  const arrayBuffer = await audio.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  try {
    const text = await callGemini({
      apiKey,
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
            {
              text: "Transcribe this audio into clean, readable text. Remove filler words (uh, um, like). Add natural punctuation. Do not summarize or change meaning. If the audio is silent or inaudible, respond with an empty string only — no brackets, no explanation.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 512,
      },
    });

    const cleaned = text.trim();
    const junkPatterns = /^\[.*\]$|no audible|no speech|inaudible|silence/i;
    if (!cleaned || junkPatterns.test(cleaned)) {
      return c.json({ text: "" });
    }

    return c.json({ text: cleaned });
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

export default transcribe;
