/**
 * Single source of truth for the public-facing base URL and locale-aware
 * path helpers. Every page that emits a canonical URL, OG image URL, or
 * sitemap entry must go through here so we never end up with `localhost`
 * URLs leaking into production metadata.
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_BASE_URL` env (set per-environment on the host)
 *   2. Hardcoded fallback `https://drawspark.art`
 *
 * `NEXT_PUBLIC_BASE_URL` should be the full origin including scheme, with no
 * trailing slash (e.g. `https://drawspark.art`).
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
  "https://drawspark.art";

export const DEFAULT_LOCALE = "en" as const;
export const LOCALES = ["en", "zh", "es", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Build a locale-prefixed path.
 *   - "en" (default) has no prefix per `localePrefix: "as-needed"`
 *   - everything else is `/<locale>/...`
 *
 * Empty string `path` is allowed and yields `/` (en) or `/<locale>` (others).
 */
export function localePath(locale: string, path = ""): string {
  const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
  const normalized = path.startsWith("/") ? path : path ? `/${path}` : "";
  return `${prefix}${normalized}` || "/";
}

/**
 * Absolute URL for any locale-aware path. Use this for `alternates.canonical`,
 * `openGraph.url`, sitemap `loc`, hreflang entries, etc.
 */
export function absoluteUrl(locale: string, path = ""): string {
  return `${SITE_URL}${localePath(locale, path)}`;
}

/**
 * Build the full `<xhtml:link>` map Next.js' sitemap and metadata APIs expect.
 * Includes `x-default` pointing at the English version, which Google treats
 * as the fallback for unmatched locales.
 */
export function languageAlternates(
  currentPath: string,
  currentLocale: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of LOCALES) {
    out[loc] = localePath(loc, currentPath);
  }
  // x-default should be a real URL, not a relative path.
  out["x-default"] = absoluteUrl(DEFAULT_LOCALE, currentPath);
  // Override the current entry to also be absolute — needed because Next
  // emits hreflang values as-is into the HTML <link> tags.
  out[currentLocale] = localePath(currentLocale, currentPath);
  return out;
}

/**
 * Default OG image used when a page doesn't ship its own.
 * Lives in `public/og.png`. We use the conventional filename so that
 * crawlers and link-preview tools (Twitter, Slack, LinkedIn, Googlebot)
 * find it even when a page forgets to set an explicit `openGraph.images`.
 * Override per-page by passing `images` to the `openGraph` block.
 */
export const DEFAULT_OG_IMAGE = "/og.png";