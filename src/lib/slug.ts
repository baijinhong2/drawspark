/**
 * Slug helpers for inspiration detail URLs.
 *
 * Format: /i/{id}/{slug}
 *   - {id}  : CUID (always present, unique by itself)
 *   - {slug}: short kebab-cased version of the title, max 60 chars
 *
 * The slug is for humans + SEO only. The id is the canonical key — the
 * page handler treats the slug as a hint and 301-redirects if it doesn't
 * match the title-derived slug, so multiple slugs always canonicalize.
 */

/** Strip emoji + non-letter/non-digit/non-space characters, collapse whitespace. */
function toAsciiWords(input: string): string[] {
  return input
    // Strip emoji & pictographs (rough but safe — keeps ASCII + CJK).
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "")
    // Keep ASCII letters/digits, CJK, and whitespace; drop everything else.
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, " ")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Build a URL-friendly slug from an inspiration title.
 *
 * - ASCII words → joined with "-"
 * - Non-ASCII (CJK, etc.) → kept as-is, joined with "-"
 * - Empty fallback → "inspiration"
 * - Hard cap: 60 chars
 */
export function inspirationSlug(title: string): string {
  const words = toAsciiWords(title);
  let slug = words.join("-");
  // Collapse runs of "-" that may come from emoji stripping.
  slug = slug.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) slug = "inspiration";
  if (slug.length > 60) {
    slug = slug.slice(0, 60).replace(/-+$/g, "");
  }
  return slug;
}

/** Build the full inspiration URL: `/i/{id}/{slug}`. Locale prefix added by next-intl Link. */
export function inspirationHref(id: string, title: string): string {
  return `/i/${id}/${inspirationSlug(title)}`;
}