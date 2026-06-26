import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL, LOCALES, localePath, DEFAULT_LOCALE } from "@/lib/seo";

/**
 * Sitemap policy:
 *   - All static public pages × 4 locales (en/zh/es/ja)
 *   - All published inspirations × 4 locales, with `<xhtml:link>` hreflang
 *     pointing at the matching page in each other locale so Google treats
 *     them as the same content in different languages.
 *
 * Priority logic:
 *   - Each hreflang group gets ONE canonical entry at full priority (the en
 *     version); locale variants are tagged 0.1 lower so Google knows which
 *     within-group entry is primary without overstating importance.
 *   - Priorities are relative to other sites, not our own — 1.0 on homepage
 *     is fine because it genuinely is the most-linked page globally.
 *
 * lastmod logic:
 *   - Static pages: hardcoded launch date — real date, never changes at
 *     build time (important for SEO credibility with search engines).
 *   - Inspiration detail pages: use the record's `updatedAt` from the DB.
 *
 * Freshness: ISR with a 10-minute window. The inspiration generate route
 * also calls `revalidatePath("/sitemap.xml")` on every successful batch, so
 * in practice new inspirations are picked up within seconds of being
 * persisted — the 10-minute ceiling is just a safety net for cases where
 * the revalidate call fails or for content edited through other paths.
 */
export const revalidate = 600;

// Real site launch date — update when the site goes live publicly.
const SITE_LAUNCH_DATE = new Date("2025-06-01T00:00:00Z");

// Static pages: priority for the canonical (en) version; locale variants
// get 0.1 lower so Google identifies the canonical entry within the group.
const STATIC_PATHS = [
  { path: "", priority: 1.0, lastmod: SITE_LAUNCH_DATE, changeFrequency: "daily" as const },
  { path: "/generate", priority: 0.9, lastmod: SITE_LAUNCH_DATE, changeFrequency: "weekly" as const },
  { path: "/explore", priority: 0.9, lastmod: SITE_LAUNCH_DATE, changeFrequency: "daily" as const },
  { path: "/about", priority: 0.6, lastmod: SITE_LAUNCH_DATE, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.6, lastmod: SITE_LAUNCH_DATE, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.4, lastmod: SITE_LAUNCH_DATE, changeFrequency: "monthly" as const },
  { path: "/feedback", priority: 0.4, lastmod: SITE_LAUNCH_DATE, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, lastmod: SITE_LAUNCH_DATE, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, lastmod: SITE_LAUNCH_DATE, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.3, lastmod: SITE_LAUNCH_DATE, changeFrequency: "yearly" as const },
];

/**
 * Build the `<xhtml:link>` map for a given path. All entries are absolute
 * URLs so search engines don't have to resolve them against an ambiguous base.
 *
 * `x-default` points at the English version — Google's catch-all when the
 * user's locale doesn't match any of our declared ones.
 */
function buildLanguages(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const loc of LOCALES) {
    out[loc] = `${SITE_URL}${localePath(loc, path)}`;
  }
  out["x-default"] = `${SITE_URL}${localePath(DEFAULT_LOCALE, path)}`;
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ---------- Static pages × locales ----------
  for (const { path, priority, lastmod, changeFrequency } of STATIC_PATHS) {
    for (const locale of LOCALES) {
      // Canonical (en) entry gets full priority; locale variants slightly lower.
      // Use Math.round(×10)/10 to avoid floating-point noise like 0.30000000000000004.
      const effectivePriority =
        locale === DEFAULT_LOCALE
          ? priority
          : Math.round((priority - 0.1) * 10) / 10;
      entries.push({
        url: `${SITE_URL}${localePath(locale, path)}`,
        lastModified: lastmod,
        changeFrequency,
        priority: effectivePriority,
        alternates: {
          languages: buildLanguages(path),
        },
      });
    }
  }

  // ---------- Inspiration detail pages × locales ----------
  // Detail route is `/i/{id}` (no title-derived slug anymore), so we only
  // need the id. updatedAt gives a real freshness signal.
  let inspirations: Array<{
    id: string;
    updatedAt: Date;
  }> = [];
  try {
    inspirations = await prisma.inspiration.findMany({
      where: { status: "published" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    // Don't fail the whole sitemap if the DB is briefly unreachable — emit
    // the static entries and skip detail pages for this build.
    console.error("[sitemap] failed to load inspirations:", error);
  }

  for (const insp of inspirations) {
    const detailPath = `/i/${insp.id}`;
    for (const locale of LOCALES) {
      const effectivePriority = locale === DEFAULT_LOCALE ? 0.8 : 0.7;
      entries.push({
        url: `${SITE_URL}${localePath(locale, detailPath)}`,
        lastModified: insp.updatedAt,
        changeFrequency: "weekly",
        priority: effectivePriority,
        alternates: {
          languages: buildLanguages(detailPath),
        },
      });
    }
  }

  return entries;
}
