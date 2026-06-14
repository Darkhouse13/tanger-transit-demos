/* =====================================================================
   Strait Systems — DeepSeek caller (server-side ONLY).
   Lifted from the Cours server.js: JSON mode, temperature 0, 30s timeout.
   The API key never leaves the server.
   ===================================================================== */

export function parseDeepSeekJson(data) {
  const choice = Array.isArray(data.choices) ? data.choices[0] : null;
  let raw =
    choice && choice.message && typeof choice.message.content === "string"
      ? choice.message.content.trim()
      : "";

  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("invalid_parser_json");
  }
  return parsed;
}

export async function callDeepSeek(systemPrompt, userText, { maxTokens = 1000 } = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("no_api_key");

  const upstream = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: maxTokens,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!upstream.ok) throw new Error("upstream_failed");
  return parseDeepSeekJson(await upstream.json());
}
