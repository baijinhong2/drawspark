import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Search-intent classifier — fallback for `/api/inspirations` when a free-text
 * keyword search returns zero hits.
 *
 * Strategy (v2): the LLM outputs 1-3 short English keywords. The route then
 * runs an OR ILIKE across title + description for those keywords. This gives
 * precise, narrow recall instead of broad enum-level filtering (e.g. "猫" →
 * `cat`, not `subject=animal` → 23 hits).
 *
 * Workflow:
 *   1. UI sends a query string `q`.
 *   2. API first does an ILIKE on title/description (keyword).
 *   3. If zero results, it asks the LLM to translate `q` into 1-3 English
 *      search keywords (this file).
 *   4. API re-queries with `OR title/description contains any of those`.
 */

const API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";
const TIMEOUT_MS = 5000;

export type SearchIntent = {
  /** 1–3 short English keywords. Empty array means "LLM couldn't translate". */
  queries: string[];
};

const SYSTEM_PROMPT = `You are a search-keyword translator for DrawSpark, a drawing-inspiration search engine.

The user typed a free-text query that the keyword search couldn't match. Translate the query into 1–3 short English keywords that would actually appear in inspiration titles and descriptions.

Rules:
- Output ONLY a JSON object: {"queries": ["kw1", "kw2"]}
- Each keyword must be a single short English word (singular noun, adjective, or verb stem). No phrases. No multi-word strings. Lowercase.
- Translate to English when the user wrote in any other language.
- The FIRST keyword must be the most direct, common English translation of the concept.
- You MAY add up to 2 closely-related synonyms (e.g. "dog" + "puppy") to broaden recall, but only if they'd plausibly appear in titles/descriptions.
- If the query is gibberish, too vague, or doesn't map to any noun/adjective, output {"queries": []}.

Examples:
- "猫"                                       → {"queries": ["cat"]}
- "画只小猫"                                  → {"queries": ["cat", "kitten"]}
- "画只小狗"                                  → {"queries": ["dog", "puppy"]}
- "可爱的动物"                                 → {"queries": ["cute", "animal"]}
- "纹身图案" / "tattoo idea"                  → {"queries": ["tattoo"]}
- "龙"                                        → {"queries": ["dragon"]}
- "送给女朋友的画" / "for girlfriend"         → {"queries": ["girlfriend"]}
- "5 分钟能画完的" / "quick doodle"            → {"queries": ["simple"]}
- "暗黑风" / "dark vibes"                     → {"queries": ["dark"]}
- "风景" / "landscape"                        → {"queries": ["landscape", "scenery"]}
- "我应该画什么" / "what should I draw"       → {"queries": []}
- "asdfgh" / "???"                            → {"queries": []}

Output ONLY the JSON object — no markdown fences, no explanation.`;

async function inferSearchIntentUncached(query: string): Promise<SearchIntent> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || !query) return { queries: [] };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn("[searchIntent] LLM non-OK:", res.status);
      return { queries: [] };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return { queries: [] };

    let parsed: { queries?: unknown };
    try {
      parsed = JSON.parse(content) as { queries?: unknown };
    } catch {
      console.warn(
        "[searchIntent] LLM returned invalid JSON:",
        content.slice(0, 200),
      );
      return { queries: [] };
    }

    // Whitelist: drop non-string / empty / overly-long entries.
    const raw = Array.isArray(parsed.queries) ? parsed.queries : [];
    const queries: string[] = [];
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim().toLowerCase();
      if (!trimmed || trimmed.length > 30) continue;
      // Reject multi-word strings (the prompt forbids them).
      if (/\s/.test(trimmed)) continue;
      if (!queries.includes(trimmed)) queries.push(trimmed);
      if (queries.length >= 3) break;
    }
    return { queries };
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      console.warn(`[searchIntent] LLM timed out after ${TIMEOUT_MS}ms`);
    } else {
      console.error("[searchIntent] LLM call failed:", err);
    }
    return { queries: [] };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Cached across requests so the same query string doesn't trigger repeated
 * LLM calls within `revalidate`. Cache key is auto-derived from the argument.
 * Key bumped to v2 to invalidate the previous enum-filter cache entries.
 */
export const inferSearchIntent = unstable_cache(
  inferSearchIntentUncached,
  ["search-intent-v2"],
  { revalidate: 300, tags: ["search-intent-v2"] },
);