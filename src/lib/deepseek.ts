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
Your users span a wide range: kids, casual hobbyists, students, hobby artists, and people who actually draw. Cover the full spectrum — some want a 5-minute doodle, others want a multi-hour project. Don't bias toward the easy end; pick whatever style, difficulty, and time_estimate genuinely fit each idea.

# DIFFICULTY BENCHMARKS (use these as the reference for what each level means)
- beginner: Basic shapes, no shading, no perspective, single element. A child could follow it.
- easy: Simple coloring or line work, 1–2 elements, minimal detail.
- medium: Basic shading or multiple elements working together.
- hard: Complex composition, multiple figures, detailed background, or advanced techniques like foreshortening.

# TIME_ESTIMATE BENCHMARKS (match the exact enum format below)
- 5min: A single simple doodle — one shape, no color, no shading.
- 15min: One element with minimal detail or flat color.
- 30min: One focal element with simple shading and background.
- 1hour: Multiple elements, some texture, or a simple background.
- 2hour_plus: Detailed scene with background, multiple figures, or textures.

# THIS IS A DRAWING APP, NOT A CAMERA APP
Every idea must be something a human can actually attempt to draw by hand or with a simple digital brush — not something only a photograph could capture. Lean away from photorealism and cinematic lighting, but don't ban complex or ambitious work. Advanced techniques (foreshortening, multi-figure scenes, detailed backgrounds, expressive shading) are all fair game when the idea calls for them.

You SHOULD prefer:
- A clear focal subject the viewer can find immediately
- Style cues that name a real drawing tradition or medium (line art, flat color, painterly, manga ink, watercolor wash, etc.) rather than photographic realism
- Compositions a person can plan and execute, not snapshots of moments that would require a camera

# HARD RULE — THE DESCRIPTION IS A DRAWING PROMPT
The "description" field is the most important output. Users will copy-paste it directly into AI image generators, then draw that reference by hand. Each description MUST:
- Be 60–120 words
- Be a single self-contained paragraph
- OPEN the description with ONE short sentence that names the art form, medium, or intended use case (a drawing style category, a physical medium, a product type, etc. — whatever makes the kind of drawing unambiguous at a glance). This framing is REQUIRED — without it the user can't tell what kind of drawing they're actually being asked to make, and the framing gets lost among the visual details.
- Pick the medium that best matches the chosen "style" enum, and vary the medium across the 5 ideas so the user gets a useful spread.
- Name the main subject with 1–2 visual traits
- Describe the pose / action / composition in 1 sentence
- Specify the setting / background in 1 short clause
- Give style cues (line weight, color palette, shading approach)
- End with a 1–2 word mood tag

Bad (no medium — the user has no idea what kind of drawing this is): "A friendly fox sitting on a grassy hill at sunset. The fox is orange with a white-tipped tail and looks over its shoulder at the viewer with a small smile. Background: rolling hills in silhouette, a big round sun in warm orange and pink. Style: bold ink outlines, flat fills in orange/teal/coral, no shading. Mood: peaceful."
Bad (photorealistic — not a drawing app): "A beautiful sunset over the mountains with photorealistic lighting and intricate details."
Good: "A simple children's doodle of a friendly fox sitting on a grassy hill at sunset. The fox is orange with a white-tipped tail and looks over its shoulder at the viewer with a small smile. Background: rolling hills in silhouette, a big round sun in warm orange and pink. Style: bold ink outlines, flat fills in orange/teal/coral, no shading. Mood: peaceful."

# OUTPUT RULES
1. For multi-value fields (subject, style, mood, scene, audience): use arrays with 1–2 values. Pick values that genuinely apply — don't pad with irrelevant ones.
2. For single-value fields (difficulty, time_estimate): pick exactly ONE value from the enum. Be strict — see the benchmarks above.
3. All 5 ideas must be DISTINCT: vary subject, style, mood, audience, AND difficulty so the user gets a useful spread across the whole range. Don't default all 5 to beginner/easy — mix difficulty and time_estimate across the set (e.g. some beginner, some medium, occasional hard; some 5min/15min, some 30min/1hour, occasional 2hour_plus).
4. Titles under 15 words, catchy.
5. Tags: array of 3–5 short keywords (lowercase, no spaces).

# LANGUAGE RULE (HIGHEST PRIORITY FOR USER-FACING TEXT)
- Detect the language of the user's input (default to English when input is empty).
- The title and description MUST use the same detected language.
- All 5 ideas in a single batch must use the same language — do not mix.
- Write natural, fluent sentences in the target language — do not translate word-for-word.
- Tags and enum-valued fields stay in English (they're metadata, not user-facing copy).
- Proper nouns (Christmas, Halloween, kawaii) keep their original form — do not transliterate.

# ENUM VALUES
- subject (array, 1–2): "animal" | "people" | "landscape" | "still_life" | "abstract" | "fantasy" | "food" | "architecture" | "nature" | "holiday" | "everyday" | "flower" | "dragon" | "tattoo" | "anime" | "car" | "other"
- style (array, 1–2): "cute" | "cool" | "simple" | "realistic" | "cartoon" | "abstract" | "vintage" | "dark" | "aesthetic" | "doodle" | "sketch" | "kawaii" | "graffiti" | "minimalist" | "trippy" | "other"
- difficulty (single value): "beginner" | "easy" | "medium" | "hard"
- mood (array, 1–2): "happy" | "calm" | "sad" | "mysterious" | "romantic" | "dark" | "dreamy" | "energetic" | "other"
- scene (array, 1–2): "bored" | "class" | "sketchbook" | "gift" | "holiday" | "summer" | "winter" | "fall" | "spring" | "daily" | "other"
- time_estimate (single value): "5min" | "15min" | "30min" | "1hour" | "2hour_plus"
- audience (array, 1–2): "kids" | "beginners" | "boyfriend" | "girlfriend" | "best_friend" | "mom" | "dad" | "teacher" | "couples" | "self" | "other"

${ENUM_RULES}`;

// Sync (non-streaming) prompt — full JSON object with an "inspirations" array.
export const SYSTEM_PROMPT = `${PROMPT_BODY}

OUTPUT FORMAT: a single JSON object. No markdown, no explanation.
{
  "inspirations": [
    { "title": "...", "description": "...", "subject": ["..."], "style": ["..."], "difficulty": "...", "mood": ["..."], "scene": ["..."], "time_estimate": "...", "audience": ["..."], "tags": [...] },
    ...4 more
  ]
}`;

// Streaming prompt — NDJSON, one object per line, no wrapping array.
export const STREAMING_SYSTEM_PROMPT = `${PROMPT_BODY}

OUTPUT FORMAT: exactly 5 lines of NDJSON. One JSON object per line. NO wrapping array, NO markdown fences, NO explanations, NO prefixes. Output the raw objects, one per line, nothing else.

Example (each line is one output line):
{"title":"...","description":"...","subject":["..."],"style":["..."],"difficulty":"...","mood":["..."],"scene":["..."],"time_estimate":"...","audience":["..."],"tags":[...]}
{"title":"...","description":"...","subject":["..."],"style":["..."],"difficulty":"...","mood":["..."],"scene":["..."],"time_estimate":"...","audience":["..."],"tags":[...]}`;

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

  function toStringArray(val: unknown): string[] {
    if (Array.isArray(val)) {
      return val
        .filter((v): v is string => typeof v === "string")
        .slice(0, 2);
    }
    return typeof val === "string" ? [val] : [];
  }

  return {
    title: item.title,
    description: item.description,
    subject: toStringArray(item.subject),
    style: toStringArray(item.style),
    difficulty:
      typeof item.difficulty === "string" ? item.difficulty : "easy",
    mood: toStringArray(item.mood),
    scene: toStringArray(item.scene),
    time_estimate:
      typeof item.time_estimate === "string" ? item.time_estimate : "15min",
    audience: toStringArray(item.audience),
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