/**
 * SEO long-tail landing page registry.
 *
 * Single source of truth for every programmatic SEO landing page on the
 * site. Used by:
 *   - the `/topics/[slug]` dynamic route (to resolve content + filters)
 *   - the footer (to render the "Browse by Topic" column dynamically)
 *   - the sitemap (to emit all entries × locales with hreflang)
 *   - the inspiration grid on each topic page (to apply subject/style
 *     filters server-side before render)
 *
 * To add a new topic page: append a new entry here and add the matching
 * i18n namespace in `messages/{locale}.json` under `topics.{slug}`. That's
 * it — footer, sitemap, and route pick it up automatically.
 *
 * Naming conventions:
 *   - `slug`      URL-safe identifier; the path segment in `/topics/{slug}`
 *   - `keyword`   the search query this page targets (verbatim, lower-case)
 *   - `localeKey` next-intl namespace, MUST be `topics.${slug}`
 *   - `intentType` grouping label, used by the footer / sitemap for clustering
 *
 * Filter semantics — every inspiration grid filter narrows what the topic
 * page surfaces. Empty / omitted fields mean "no filter on that axis".
 */
export type SeoTopicIntent =
  | "head-term"
  | "scene"
  | "theme"
  | "audience"
  | "difficulty"
  | "style"
  | "hub";

export type SeoTopicPage = {
  /** URL-safe identifier; appears in `/topics/{slug}` and the slug namespace. */
  slug: string;
  /** The exact search query this page targets (lower-case, as users type it). */
  keyword: string;
  /** next-intl namespace; conventionally `topics.${slug}`. */
  localeKey: string;
  /** Intent cluster — used for footer grouping + future analytics rollups. */
  intentType: SeoTopicIntent;
  /** Monthly search volume (US, from keyword research sheet). */
  vol: number;
  /** Keyword difficulty (0-100, from keyword research sheet). */
  kd: number;
  /** Cost per click in USD (from keyword research sheet). */
  cpc: number;
  /** Original spreadsheet category for traceability. */
  category: string;
  /** Server-side filter applied to the inspiration grid on this page. */
  filter: {
    subject?: string[];
    style?: string[];
    difficulty?: string[];
    scene?: string[];
    audience?: string[];
    /** Free-text keyword matched against inspiration title/description. */
    q?: string;
  };
  /**
   * Pre-fill text passed to /generate so the user's first generation is
   * already biased toward this topic. Empty string = no pre-fill.
   */
  generatePrompt: string;
};

/**
 * Phase 1 + Phase 2 launch batch — 20 head-term + scene + theme + audience +
 * style + difficulty keywords chosen for volume × KD. Ordered by descending
 * `vol` so the registry doubles as a priority list when we want to promote
 * top terms first.
 */
export const SEO_TOPIC_PAGES: readonly SeoTopicPage[] = [
  {
    slug: "things-to-draw-when-bored",
    keyword: "things to draw when bored",
    localeKey: "topics.things-to-draw-when-bored",
    intentType: "scene",
    vol: 18100,
    kd: 27,
    cpc: 0.15,
    category: "场景型(bored/prompt)",
    filter: { scene: ["bored"] },
    generatePrompt: "something fun to draw when bored",
  },
  {
    slug: "what-should-i-draw",
    keyword: "what should i draw",
    localeKey: "topics.what-should-i-draw",
    intentType: "head-term",
    vol: 14800,
    kd: 13,
    cpc: 0.2,
    category: "场景型(bored/prompt)",
    filter: {},
    generatePrompt: "",
  },
  {
    slug: "drawing-prompts",
    keyword: "drawing prompts",
    localeKey: "topics.drawing-prompts",
    intentType: "head-term",
    vol: 9900,
    kd: 21,
    cpc: 0.42,
    category: "场景型(bored/prompt)",
    filter: {},
    generatePrompt: "give me a creative drawing prompt",
  },
  {
    slug: "what-to-draw-when-bored",
    keyword: "what to draw when bored",
    localeKey: "topics.what-to-draw-when-bored",
    intentType: "scene",
    vol: 9900,
    kd: 29,
    cpc: 0.15,
    category: "场景型(bored/prompt)",
    filter: { scene: ["bored"] },
    generatePrompt: "what should I draw when bored",
  },
  {
    slug: "drawing-inspiration",
    keyword: "drawing inspiration",
    localeKey: "topics.drawing-inspiration",
    intentType: "hub",
    vol: 8100,
    kd: 19,
    cpc: 0.16,
    category: "通用/其他",
    filter: {},
    generatePrompt: "give me fresh drawing inspiration",
  },
  {
    slug: "best-easy-drawing",
    keyword: "best easy drawing",
    localeKey: "topics.best-easy-drawing",
    intentType: "difficulty",
    vol: 6600,
    kd: 28,
    cpc: 0,
    category: "通用/其他",
    filter: { difficulty: ["easy"] },
    generatePrompt: "an easy drawing idea for beginners",
  },
  {
    slug: "christmas-drawing-ideas",
    keyword: "christmas drawing ideas",
    localeKey: "topics.christmas-drawing-ideas",
    intentType: "theme",
    vol: 6600,
    kd: 28,
    cpc: 0.36,
    category: "holiday节日季节",
    filter: { subject: ["holiday"], scene: ["holiday"] },
    generatePrompt: "a christmas drawing idea",
  },
  {
    slug: "art-drawings",
    keyword: "art drawings",
    localeKey: "topics.art-drawings",
    intentType: "hub",
    vol: 4400,
    kd: 27,
    cpc: 1.28,
    category: "通用/其他",
    filter: {},
    generatePrompt: "an art drawing idea",
  },
  {
    slug: "stuff-to-draw-when-your-bored",
    keyword: "stuff to draw when your bored",
    localeKey: "topics.stuff-to-draw-when-your-bored",
    intentType: "scene",
    vol: 2400,
    kd: 21,
    cpc: 0,
    category: "场景型(bored/prompt)",
    filter: { scene: ["bored"] },
    generatePrompt: "stuff to draw when bored",
  },
  {
    slug: "aesthetic-things-to-draw",
    keyword: "aesthetic things to draw",
    localeKey: "topics.aesthetic-things-to-draw",
    intentType: "style",
    vol: 1900,
    kd: 22,
    cpc: 0,
    category: "aesthetic风格亚文化",
    filter: { style: ["aesthetic"] },
    generatePrompt: "an aesthetic drawing idea",
  },
  {
    slug: "cute-and-easy-drawing-ideas",
    keyword: "cute and easy drawing ideas",
    localeKey: "topics.cute-and-easy-drawing-ideas",
    intentType: "difficulty",
    vol: 2400,
    kd: 19,
    cpc: 0.18,
    category: "通用/其他",
    filter: { style: ["cute"], difficulty: ["easy"] },
    generatePrompt: "a cute and easy drawing idea for beginners",
  },
  {
    slug: "drawing-a-blank-on-story-ideas",
    keyword: "drawing a blank on story ideas",
    localeKey: "topics.drawing-a-blank-on-story-ideas",
    intentType: "head-term",
    vol: 1700,
    kd: 17,
    cpc: 0.12,
    category: "通用/其他",
    filter: {},
    generatePrompt: "a story-driven drawing idea to break writer's block",
  },
  {
    slug: "drawing-prompts-teenagers",
    keyword: "drawing prompts teenagers",
    localeKey: "topics.drawing-prompts-teenagers",
    intentType: "audience",
    vol: 1300,
    kd: 16,
    cpc: 0.22,
    category: "受众/年龄段",
    filter: {},
    generatePrompt: "a cool drawing prompt for teenagers",
  },
  {
    slug: "hard-things-to-draw",
    keyword: "hard things to draw",
    localeKey: "topics.hard-things-to-draw",
    intentType: "difficulty",
    vol: 2200,
    kd: 21,
    cpc: 0.14,
    category: "通用/其他",
    filter: { difficulty: ["hard"] },
    generatePrompt: "a challenging drawing idea for advanced artists",
  },
  {
    slug: "kids-drawing-ideas",
    keyword: "kids drawing ideas",
    localeKey: "topics.kids-drawing-ideas",
    intentType: "audience",
    vol: 3200,
    kd: 24,
    cpc: 0.31,
    category: "受众/年龄段",
    filter: { audience: ["kids"] },
    generatePrompt: "a fun drawing idea for kids",
  },
  {
    slug: "beginner-drawing-ideas",
    keyword: "beginner drawing ideas",
    localeKey: "topics.beginner-drawing-ideas",
    intentType: "difficulty",
    vol: 2900,
    kd: 20,
    cpc: 0.27,
    category: "通用/其他",
    filter: { difficulty: ["beginner"] },
    generatePrompt: "an easy drawing idea for total beginners",
  },
  {
    slug: "drawing-clipart",
    keyword: "drawing clipart",
    localeKey: "topics.drawing-clipart",
    intentType: "style",
    vol: 1800,
    kd: 18,
    cpc: 0.45,
    category: "style风格",
    filter: { style: ["cartoon"] },
    generatePrompt: "a clipart-style drawing idea",
  },
  {
    slug: "random-drawings",
    keyword: "random drawings",
    localeKey: "topics.random-drawings",
    intentType: "head-term",
    vol: 1600,
    kd: 14,
    cpc: 0.11,
    category: "通用/其他",
    filter: {},
    generatePrompt: "a completely random drawing idea",
  },
  {
    slug: "things-to-draw-when-your-bored",
    keyword: "things to draw when your bored",
    localeKey: "topics.things-to-draw-when-your-bored",
    intentType: "scene",
    vol: 1900,
    kd: 23,
    cpc: 0.13,
    category: "场景型(bored/prompt)",
    filter: { scene: ["bored"] },
    generatePrompt: "something fun to draw when you're bored",
  },
  {
    slug: "cool-pictures-to-draw",
    keyword: "cool pictures to draw",
    localeKey: "topics.cool-pictures-to-draw",
    intentType: "style",
    vol: 2100,
    kd: 19,
    cpc: 0.24,
    category: "style风格",
    filter: { style: ["cool"] },
    generatePrompt: "a cool picture to draw",
  },
] as const;

/**
 * Lookup map keyed by slug — O(1) access from the page route. Includes
 * an unknown-slug guard so callers can branch to a 404 without throwing.
 */
const SEO_TOPIC_BY_SLUG: ReadonlyMap<string, SeoTopicPage> = new Map(
  SEO_TOPIC_PAGES.map((p) => [p.slug, p]),
);

export function getSeoTopicBySlug(slug: string): SeoTopicPage | undefined {
  return SEO_TOPIC_BY_SLUG.get(slug);
}

export function isKnownSeoTopicSlug(slug: string): boolean {
  return SEO_TOPIC_BY_SLUG.has(slug);
}