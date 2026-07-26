import type { HumanProfile, ShelterDog } from "@/types";

// ---------------------------------------------------------------------------
// Merge Gateway — OpenAI-compatible LLM proxy.
// Docs: https://docs.merge.dev/merge-gateway/get-started
//   base_url = "https://api-gateway.merge.dev/v1/openai"  (+ /chat/completions)
//   Authorization: Bearer <MERGE_GATEWAY_KEY>
// Server-side only. Any failure returns the hardcoded fallback.
// ---------------------------------------------------------------------------

const DEFAULT_BASE_URL = "https://api-gateway.merge.dev/v1/openai";
const TIMEOUT_MS = 5000;

const FALLBACK =
  "Based on your calendar and activity patterns, this dog's energy and routine needs line up closely with how you actually spend your week.";

function prompt(profile: HumanProfile, dog: ShelterDog): string {
  const traits = profile.traits
    .map((t) => `${t.label}: ${t.value.toFixed(2)} (${t.evidence.join("; ")})`)
    .join("\n");
  const needs = Object.entries(dog.needs)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return [
    `Person summary: ${profile.summary}`,
    `Person traits:\n${traits}`,
    `Dog: ${dog.name}, ${dog.breed}, ${dog.sex}. Character: ${dog.character}. Features: ${dog.features}.`,
    `Dog needs: ${needs}`,
    "In 2-3 sentences, warmly explain why this dog suits this person. Reference specific evidence. No lists, no preamble.",
  ].join("\n\n");
}

export async function explainMatch(profile: HumanProfile, dog: ShelterDog): Promise<string> {
  const key = process.env.MERGE_GATEWAY_KEY;
  if (!key) return FALLBACK;

  const baseUrl = (process.env.MERGE_GATEWAY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MERGE_GATEWAY_MODEL || "gpt-5.2",
        messages: [
          {
            role: "system",
            content:
              "You explain dog-adoption matches. Be specific, warm, and brief. Never invent data.",
          },
          { role: "user", content: prompt(profile, dog) },
        ],
        max_tokens: 220,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`[gateway] HTTP ${res.status}`);
      return FALLBACK;
    }

    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : FALLBACK;
  } catch (err) {
    console.error("[gateway] explainMatch failed:", err);
    return FALLBACK;
  }
}
