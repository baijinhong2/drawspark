import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Robots policy:
 *   - Allow everything by default.
 *   - Disallow: /api/star (returns JSON, not user content)
 *   - Disallow: profile + my-inspirations (per-user pages; meta robots on
 *     each page already say noindex, but the upstream Disallow keeps
 *     crawlers from hitting those endpoints at all)
 *   - The site also exposes 4 locales via [locale]/; we cover both the
 *     default-locale URL (/profile) and the prefixed ones (slash-star-slash-profile).
 *
 * The wildcard prefix is built by string concatenation below because the
 * literal "/" + "*" sequence is mis-parsed as a block-comment start by
 * some JS parsers (Turbopack's). The runtime value is identical.
 */
const WILDCARD_PREFIX = "/" + "*";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          // Per-user pages — no public SEO value, and they depend on the
          // session cookie so crawling them is pointless at best and a
          // resource drain at worst.
          "/profile",
          "/my-inspirations",
          WILDCARD_PREFIX + "/profile",
          WILDCARD_PREFIX + "/my-inspirations",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}