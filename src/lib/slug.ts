/**
 * Slug helpers for inspiration detail URLs.
 *
 * The detail route is now `/i/{id}` — we intentionally dropped the
 * title-derived slug. AI-generated titles can be in any language, and
 * non-ASCII characters break the `Location` HTTP header used by server
 * redirects. The id alone is unique, stable, and short.
 *
 * The legacy URL form `/i/{id}/{slug}` is handled by a redirect page that
 * 301s to `/i/{id}`.
 *
 * `inspirationSlug` itself is kept because some non-URL callers still want
 * a deterministic kebab/cjk title fragment (e.g. for logging, sharing,
 * older integrations). It's just no longer part of the route.
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
 * Build a URL-friendly slug fragment from an inspiration title.
 *
 * NOT used in the detail route anymore — see the file header. Kept for
 * downstream consumers (logs, debug output, etc.) that want a stable,
 * human-readable identifier.
 */
export function inspirationSlug(title: string): string {
  const words = toAsciiWords(title);
  let slug = words.join("-");
  slug = slug.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) slug = "inspiration";
  if (slug.length > 60) {
    slug = slug.slice(0, 60).replace(/-+$/g, "");
  }
  return slug;
}

/** Build the canonical detail URL: `/i/{id}`. Locale prefix added by next-intl Link. */
export function inspirationHref(id: string): string {
  return `/i/${id}`;
}
