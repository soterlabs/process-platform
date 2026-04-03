/**
 * Agent service: calls Google Gemini with a system prompt and context from previous steps.
 * API key from env: GEMINI_API_KEY
 */
import { serverEnv } from "@/lib/server-env";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.0-flash";

export type AgentService = {
  runAgent(options: {
    systemPrompt: string;
    context: Record<string, unknown>;
  }): Promise<string>;
};

async function callGemini(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = serverEnv("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const url = `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    error?: { message?: string };
  };

  if (data.error) {
    throw new Error(data.error.message ?? "Gemini API error");
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (text == null) {
    throw new Error("Unexpected Gemini API response shape");
  }
  return text;
}

export const agentService: AgentService = {
  async runAgent({ systemPrompt, context }) {
    const userMessage =
      "Here is all input collected from the user so far (JSON):\n\n" +
      JSON.stringify(context, null, 2);
    return callGemini(systemPrompt, userMessage);
  },
};
