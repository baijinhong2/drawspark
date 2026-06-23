import type { InspirationResponse } from "@/lib/types";

export type FilterKey =
  | "subject"
  | "style"
  | "difficulty"
  | "mood"
  | "scene"
  | "time_estimate"
  | "audience";

export type MultiFilters = Record<FilterKey, string[]>;

export const FILTER_KEYS: readonly FilterKey[] = [
  "difficulty",
  "subject",
  "time_estimate",
  "style",
  "audience",
  "mood",
  "scene",
] as const;

export const EMPTY_FILTERS: MultiFilters = {
  subject: [],
  style: [],
  difficulty: [],
  mood: [],
  scene: [],
  time_estimate: [],
  audience: [],
};

/** Display label for each filter dimension. Resolved by gallery namespace. */
export const FILTER_LABELS: Record<FilterKey, string> = {
  subject: "filterSubject",
  style: "filterStyle",
  difficulty: "filterDifficulty",
  mood: "filterMood",
  scene: "filterScene",
  time_estimate: "filterTime",
  audience: "filterAudience",
};

// ============================================================
// Quick tags — single-tap shortcuts that replace the matching
// filter dimension (or change sort / clear all for special ids).
// ============================================================

export type QuickAction =
  | { kind: "filter"; key: FilterKey; value: string }
  | { kind: "sort"; value: "latest" | "likes" | "copies" | "favorites" }
  | { kind: "random" };

export interface QuickTag {
  id: string;
  icon: string;
  /** Translation key under enums namespace (or quickTags for fallback labels). */
  labelKey: string;
  /** Namespace for translation: "enums" for enum values, "quickTags" for fallback strings. */
  namespace: "enums" | "quickTags";
  /** Type of dimension the tag filters (used to colour/position). */
  group: "style" | "difficulty" | "subject" | "scene" | "special";
  action: QuickAction;
}

export const QUICK_TAGS: QuickTag[] = [
  // ===== Style =====
  { id: "cute", icon: "✨", labelKey: "style.cute", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "cute" } },
  { id: "cool", icon: "😎", labelKey: "style.cool", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "cool" } },
  { id: "simple", icon: "◽", labelKey: "style.simple", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "simple" } },
  { id: "sketch", icon: "✏️", labelKey: "style.sketch", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "sketch" } },
  { id: "aesthetic", icon: "🌙", labelKey: "style.aesthetic", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "aesthetic" } },
  { id: "cartoon", icon: "🎭", labelKey: "style.cartoon", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "cartoon" } },
  { id: "dark", icon: "🖤", labelKey: "style.dark", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "dark" } },
  { id: "kawaii", icon: "🎀", labelKey: "style.kawaii", namespace: "enums", group: "style", action: { kind: "filter", key: "style", value: "kawaii" } },

  // ===== Difficulty =====
  { id: "easy", icon: "⭐", labelKey: "difficulty.easy", namespace: "enums", group: "difficulty", action: { kind: "filter", key: "difficulty", value: "easy" } },
  { id: "beginner", icon: "🌱", labelKey: "difficulty.beginner", namespace: "enums", group: "difficulty", action: { kind: "filter", key: "difficulty", value: "beginner" } },

  // ===== Subject =====
  { id: "animal", icon: "🐾", labelKey: "subject.animal", namespace: "enums", group: "subject", action: { kind: "filter", key: "subject", value: "animal" } },
  { id: "flower", icon: "🌸", labelKey: "subject.flower", namespace: "enums", group: "subject", action: { kind: "filter", key: "subject", value: "flower" } },
  { id: "landscape", icon: "🌄", labelKey: "subject.landscape", namespace: "enums", group: "subject", action: { kind: "filter", key: "subject", value: "landscape" } },
  { id: "tattoo", icon: "🖤", labelKey: "subject.tattoo", namespace: "enums", group: "subject", action: { kind: "filter", key: "subject", value: "tattoo" } },
  { id: "anime", icon: "🎌", labelKey: "subject.anime", namespace: "enums", group: "subject", action: { kind: "filter", key: "subject", value: "anime" } },
  { id: "fantasy", icon: "🐉", labelKey: "subject.fantasy", namespace: "enums", group: "subject", action: { kind: "filter", key: "subject", value: "fantasy" } },
  { id: "food", icon: "🍕", labelKey: "subject.food", namespace: "enums", group: "subject", action: { kind: "filter", key: "subject", value: "food" } },

  // ===== Scene =====
  { id: "bored", icon: "💭", labelKey: "scene.bored", namespace: "enums", group: "scene", action: { kind: "filter", key: "scene", value: "bored" } },
  { id: "sketchbook", icon: "📓", labelKey: "scene.sketchbook", namespace: "enums", group: "scene", action: { kind: "filter", key: "scene", value: "sketchbook" } },

  // ===== Special =====
  { id: "random", icon: "🎲", labelKey: "random", namespace: "quickTags", group: "special", action: { kind: "random" } },
  { id: "top", icon: "🔥", labelKey: "top", namespace: "quickTags", group: "special", action: { kind: "sort", value: "likes" } },
];

/**
 * How many quick tags to draw per batch. The bar measures available width and
 * only shows as many as fit on a single row, so this number acts as an upper
 * bound rather than a fixed display count.
 */
export const QUICK_TAGS_BATCH_SIZE = 12;

/**
 * Pick a random subset of `count` tags from the pool, deterministically shuffled
 * using the supplied seed (so server + client render the same batch).
 */
export function pickRandomTags(
  pool: QuickTag[] = QUICK_TAGS,
  count: number,
  seed: number,
): QuickTag[] {
  // Mulberry32 PRNG — small + deterministic.
  let s = seed >>> 0;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function parseList<T extends string>(
  raw: string | null,
  options: readonly T[],
): T[] {
  if (!raw) return [];
  const seen = new Set<T>();
  const out: T[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (
      trimmed &&
      (options as readonly string[]).includes(trimmed) &&
      !seen.has(trimmed as T)
    ) {
      seen.add(trimmed as T);
      out.push(trimmed as T);
    }
  }
  return out;
}

export type { InspirationResponse };