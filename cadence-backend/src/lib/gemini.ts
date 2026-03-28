export async function callGemini(params: {
  apiKey: string;
  contents: unknown[];
  generationConfig?: Record<string, unknown>;
  model?: string;
}): Promise<string> {
  const model = params.model ?? "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${params.apiKey}`;

  const body: Record<string, unknown> = {
    contents: params.contents,
  };

  if (params.generationConfig) {
    body.generationConfig = params.generationConfig;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    if (response.status === 401) {
      throw new Error("Invalid API key. Please check your Gemini API key.");
    }
    if (response.status === 429) {
      throw new Error(
        "Rate limited by Gemini API. Please try again shortly."
      );
    }
    if (response.status === 502) {
      throw new Error("Gemini API is temporarily unavailable. Please retry.");
    }
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No text content in Gemini response.");
  }

  return text;
}
