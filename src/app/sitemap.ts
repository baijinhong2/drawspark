import type { MetadataRoute } from "next";
import { inspirationSlug } from "@/lib/slug";
import { prisma } from "@/lib/prisma";
import { SITE_URL, LOCALES, localePath } from "@/lib/seo";

/**
 * Sitemap policy:
 *   - All static public pages × 4 locales (en/zh/es/ja)
 *   - All published inspirations × 4 locales, with `<xhtml:link>` hreflang
 *     pointing at the matching page in each other locale so Google treats
 *     them as the same content in different languages.
 *
 * `lastModified` is the inspiration's `updatedAt` so search engines see a
 * real signal instead of the build timestamp.
 *
 * Freshness: ISR with a 10-minute window. The inspiration generate route
 * also calls `revalidatePath("/sitemap.xml")` on every successful batch, so
 * in practice new inspirations are picked up within seconds of being
 * persisted — the 10-minute ceiling is just a safety net for cases where
 * the revalidate call fails or for content edited through other paths.
 */
export const revalidate = 600;

const STATIC_PATHS = [
  { path: "", priority: 1.0, changeFrequency: "daily" as const },
  { path: "/generate", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/explore", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/feedback", priority: 0.4, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly" as const },
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
  out["x-default"] = `${SITE_URL}${localePath("en", path)}`;
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // ---------- Static pages × locales ----------
  for (const { path, priority, changeFrequency } of STATIC_PATHS) {
    // Emit one entry per locale so Google can pair each URL with the right
    // hreflang siblings via the alternates block below.
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}${localePath(locale, path)}`,
        lastModified: new Date(),
        changeFrequency,
        priority,
        alternates: {
          languages: buildLanguages(path),
        },
      });
    }
  }

  // ---------- Inspiration detail pages × locales ----------
  // Pull only the fields we need — slugs are recomputed from titles because
  // the slug in the URL must match `inspirationSlug(title)` exactly (the
  // page handler 308-redirects mismatches). updatedAt gives a real signal.
  let inspirations: Array<{
    id: string;
    title: string;
    updatedAt: Date;
  }> = [];
  try {
    inspirations = await prisma.inspiration.findMany({
      where: { status: "published" },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    // Don't fail the whole sitemap if the DB is briefly unreachable — emit
    // the static entries and skip detail pages for this build.
    console.error("[sitemap] failed to load inspirations:", error);
  }

  for (const insp of inspirations) {
    const detailPath = `/i/${insp.id}/${inspirationSlug(insp.title)}`;
    for (const locale of LOCALES) {
      entries.push({
        url: `${SITE_URL}${localePath(locale, detailPath)}`,
        lastModified: insp.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: buildLanguages(detailPath),
        },
      });
    }
  }

  return entries;
}