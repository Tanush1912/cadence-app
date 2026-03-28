import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

/**
 * Generic Gemini proxy — keeps API keys out of browser network logs.
 * The key is sent in the POST body, not in the URL.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { apiKey, contents, generationConfig, model } = body;

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  if (!contents) {
    return NextResponse.json({ error: "Contents required" }, { status: 400 });
  }

  try {
    const text = await callGemini({
      apiKey: apiKey.trim(),
      contents,
      generationConfig,
      model,
    });
    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: "Gemini request failed" }, { status: 502 });
  }
}
