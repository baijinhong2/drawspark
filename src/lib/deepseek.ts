import OpenAI from "openai";
import type { GeneratedInspiration } from "./types";

const ENUM_RULES = `ENUM VALUES (MUST USE EXACTLY THESE — never invent new ones):
- subject: animal, people, landscape, still_life, abstract, fantasy, food, architecture, nature, holiday, everyday, flower, dragon, tattoo, anime, car, other
- style: cute, cool, simple, realistic, cartoon, abstract, vintage, dark, aesthetic, doodle, sketch, kawaii, graffiti, minimalist, trippy, other
- difficulty: beginner, easy, medium, hard
- mood: happy, calm, sad, mysterious, romantic, dark, dreamy, energetic, other
- scene: bored, class, sketchbook, gift, holiday, summer, winter, fall, spring, daily, other
- time_estimate: 5min, 15min, 30min, 1hour, 2hour_plus
- audience: kids, beginners, boyfriend, girlfriend, best_friend, mom, dad, teacher, couples, self, other`;

// Shared body used by both the sync and streaming prompts. Defines role,
// audience, hard rules, and enum defaults. The two prompts differ only in
// their final output-format instruction.
const PROMPT_BODY = `You are the inspiration engine for DrawSpark — a free drawing-ideas generator. You turn a user's vibe (or pure randomness) into 5 distinct sketch-ready prompts they can sit down and draw.

# WHO YOU'RE TALKING TO
Your users are mostly beginners: kids, casual hobbyists, students, and a small number of actual artists. Most cannot draw anatomy, perspective, or photorealism well. Your default output MUST work for someone with a single pencil and 15 minutes.

# DEFAULT ENUM VALUES (override only if the user explicitly signals otherwise)
- difficulty: default "easy" or "beginner". Use "medium" / "hard" ONLY when the user explicitly asks for harder, more advanced, complex, challenging, or for experienced artists.
- style: default "cute", "simple", "doodle", "sketch", "kawaii", or "cartoon". Use "realistic", "vintage", "dark" only when the user clearly wants them.
- audience: default "kids" or "beginners". Use "self" / "couples" / etc. when the user signals a recipient.
- time_estimate: default "5min" or "15min". Most users browse on phones and want quick wins.

# HARD RULE — THIS IS A DRAWING APP, NOT A CAMERA APP
Every idea must be something a human can actually attempt with a pencil, pen, or simple digital brush. You MUST NOT generate:
- Photorealistic scenes, hyper-detailed textures, or cinematic lighting that only a camera or AI render could achieve
- Compositions requiring advanced anatomy, complex perspective, accurate foreshortening, or photoreal color theory
- Subjects that depend on photographic reference (specific real people, real places, brand-name objects)

You SHOULD prefer:
- 1–3 clear focal elements (a single cat, a single object, one character + one prop)
- Flat colors or simple 2–3 tone shading
- Clear line work, cute proportions, big shapes
- Recognizable, friendly subjects: animals, food, simple objects, fantasy creatures, everyday scenes

# HARD RULE — THE DESCRIPTION IS A DRAWING PROMPT
The "description" field is the most important output. Users will copy-paste it directly into AI image generators (Midjourney, DALL-E, Stable Diffusion) to get a reference, then draw that reference by hand. Each description MUST:

- Be 60–120 words (long enough to be useful as a generation prompt, short enough to read at a glance)
- Be a single self-contained paragraph
- Name the main subject with 1–2 visual traits (e.g., "a chubby orange tabby cat with big round eyes")
- Describe the pose / action / composition in 1 sentence
- Specify the setting / background in 1 short clause
- Give style cues: line weight, color palette, shading approach (e.g., "clean ink outlines with soft watercolor fills in peach and sage")
- End with a 1–2 word mood tag (e.g., "Mood: cozy.")

Bad: "A beautiful sunset over the mountains with photorealistic lighting and intricate details."
Good: "Draw a friendly fox sitting on a grassy hill at sunset. The fox is orange with a white-tipped tail and looks over its shoulder at the viewer with a small smile. Background: rolling hills in silhouette, a big round sun in warm orange and pink. Style: bold ink outlines, flat fills in orange/teal/coral, no shading. Mood: peaceful."

# OUTPUT RULES
1. Use ONLY the enum values below — never invent new ones.
2. All 5 ideas must be DISTINCT: vary subject, style, mood, or audience so the user gets a useful spread.
3. Titles under 15 words, catchy.
4. Tags: array of 3–5 short keywords (lowercase, no spaces).
5. The 5 ideas must collectively cover the user's theme (when given) without repeating the same composition.

${ENUM_RULES}`;

// Sync (non-streaming) prompt — full JSON object with an "inspirations" array.
export const SYSTEM_PROMPT = `${PROMPT_BODY}

OUTPUT FORMAT: a single JSON object. No markdown, no explanation.
{
  "inspirations": [
    { "title": "...", "description": "...", "subject": "...", "style": "...", "difficulty": "...", "mood": "...", "scene": "...", "time_estimate": "...", "audience": "...", "tags": [...] },
    ...4 more
  ]
}`;

// Streaming prompt — NDJSON, one object per line, no wrapping array.
export const STREAMING_SYSTEM_PROMPT = `${PROMPT_BODY}

OUTPUT FORMAT: exactly 5 lines of NDJSON. One JSON object per line. NO wrapping array, NO markdown fences, NO explanations, NO prefixes. Output the raw objects, one per line, nothing else.

Example (each line is one output line):
{"title":"...","description":"...","subject":"...","style":"...","difficulty":"...","mood":"...","scene":"...","time_estimate":"...","audience":"...","tags":[...]}
{"title":"...","description":"...","subject":"...","style":"...","difficulty":"...","mood":"...","scene":"...","time_estimate":"...","audience":"...","tags":[...]}`;

function getDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set");
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

function validateInspiration(raw: unknown): GeneratedInspiration | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.title !== "string" || typeof item.description !== "string") {
    return null;
  }
  return {
    title: item.title,
    description: item.description,
    subject: typeof item.subject === "string" ? item.subject : "other",
    style: typeof item.style === "string" ? item.style : "other",
    difficulty:
      typeof item.difficulty === "string" ? item.difficulty : "easy",
    mood: typeof item.mood === "string" ? item.mood : "other",
    scene: typeof item.scene === "string" ? item.scene : "other",
    time_estimate:
      typeof item.time_estimate === "string" ? item.time_estimate : "15min",
    audience: typeof item.audience === "string" ? item.audience : "other",
    tags: Array.isArray(item.tags)
      ? (item.tags.filter((t): t is string => typeof t === "string"))
      : [],
  };
}

function buildInstruction(userInput?: string): string {
  if (userInput) {
    return `The user provided this theme: "${userInput}"

Generate 5 distinct drawing inspirations that explore different angles of this theme. Strictly follow the role / audience / defaults / DRAWING-APP-NOT-CAMERA / DESCRIPTION-IS-A-PROMPT rules from the system prompt.`;
  }
  return `Generate 5 completely random and diverse drawing inspirations. Strictly follow the role / audience / defaults / DRAWING-APP-NOT-CAMERA / DESCRIPTION-IS-A-PROMPT rules from the system prompt. Vary subject, style, and mood across the 5 ideas so the user gets a useful spread.`;
}

export async function generateInspirations(
  userInput?: string,
): Promise<GeneratedInspiration[]> {
  const deepseek = getDeepSeekClient();
  const response = await deepseek.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildInstruction(userInput) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.9,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from DeepSeek API");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("DeepSeek API returned malformed JSON");
  }

  const inspirations = (parsed as { inspirations?: unknown })?.inspirations;
  if (!Array.isArray(inspirations) || inspirations.length === 0) {
    throw new Error("Invalid inspirations format from DeepSeek API");
  }

  const validated: GeneratedInspiration[] = [];
  for (const raw of inspirations.slice(0, 5)) {
    const v = validateInspiration(raw);
    if (v) validated.push(v);
  }

  if (validated.length === 0) {
    throw new Error("DeepSeek API returned no valid inspirations");
  }

  return validated;
}

const MAX_ITEMS = 5;

function parseStreamLine(line: string): GeneratedInspiration[] | null {
  if (!line) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  const wrapped = (raw as { inspirations?: unknown })?.inspirations;
  if (Array.isArray(wrapped)) {
    const items: GeneratedInspiration[] = [];
    for (const entry of wrapped.slice(0, MAX_ITEMS)) {
      const v = validateInspiration(entry);
      if (v) items.push(v);
    }
    return items.length > 0 ? items : null;
  }
  const v = validateInspiration(raw);
  return v ? [v] : null;
}

/**
 * Streams inspirations from DeepSeek as NDJSON. Yields each parsed item as
 * soon as the model finishes writing it, so the first idea typically reaches
 * the client within 1-2 seconds. Falls back gracefully if the model ignores
 * the NDJSON instruction and returns a wrapped object instead.
 */
export async function* streamInspirations(
  userInput?: string,
): AsyncGenerator<GeneratedInspiration> {
  const deepseek = getDeepSeekClient();
  const stream = await deepseek.chat.completions.create({
    model: "deepseek-v4-flash",
    messages: [
      { role: "system", content: STREAMING_SYSTEM_PROMPT },
      { role: "user", content: buildInstruction(userInput) },
    ],
    stream: true,
    temperature: 0.9,
    max_tokens: 2500,
  });

  let buffer = "";
  let emitted = 0;

  const handleLine = (line: string): void => {
    if (emitted >= MAX_ITEMS) return;
    const items = parseStreamLine(line);
    if (!items) return;
    for (const item of items) {
      if (emitted >= MAX_ITEMS) return;
      emitted++;
      queue.push(item);
    }
  };

  // Items produced by the current chunk, drained via `yield*` so multiple
  // items from one wrapped-JSON line all flow out in order.
  const queue: GeneratedInspiration[] = [];

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (typeof content !== "string" || content.length === 0) continue;
    buffer += content;

    let newlineIdx: number;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      handleLine(line);
      if (queue.length > 0) yield* queue.splice(0);
      if (emitted >= MAX_ITEMS) return;
    }
  }

  // Handle any trailing content without a final newline
  if (emitted < MAX_ITEMS) {
    const trailing = buffer.trim();
    if (trailing) handleLine(trailing);
    if (queue.length > 0) yield* queue.splice(0);
  }
}