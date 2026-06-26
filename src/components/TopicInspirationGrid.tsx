import { unstable_cache } from "next/cache";
import { getTranslations } from "next-intl/server";
import { InspirationCard } from "@/components/InspirationCard";
import { Link } from "@/i18n/navigation";
import { serializeInspiration } from "@/lib/inspiration";
import type { SeoTopicPage } from "@/lib/seo-pages";
import { prisma } from "@/lib/prisma";

const TOPIC_GRID_LIMIT = 12;

/**
 * Topic-scoped inspiration grid rendered at the TOP of every SEO
 * long-tail landing page (above the H1 + SEO sections).
 *
 * This is intentionally simpler than the explore-page GalleryClient:
 *   - Server-rendered (no client JS, fast first paint, SEO-friendly)
 *   - No infinite scroll — one batch of TOPIC_GRID_LIMIT items
 *   - No filter drawer — the filter is baked in by the registry
 *   - No "go generate" hint popups
 *
 * The full filterable gallery still lives at `/explore`; this grid
 * just gives the user something to interact with before they scroll
 * into the SEO body copy, and proves to search engines the page has
 * real, topical content.
 */
export async function TopicInspirationGrid({
  topic,
  locale,
}: {
  topic: SeoTopicPage;
  locale: string;
}) {
  const t = await getTranslations("topics");

  // Build the Prisma where clause from the registry filter. Empty filter
  // object (head-term / hub topics) surfaces the most-liked inspirations.
  //
  // The Prisma schema stores subject / style / scene / audience as String[]
  // (list fields), so we use `has` (single-element membership) instead of
  // `in` (enum membership). `difficulty` is a scalar enum and uses `in`.
  //
  // Each filter axis is AND'd at the top level. Within an axis, multiple
  // values are OR'd (match any). All axes are wrapped in `AND: [...]` so
  // Prisma doesn't see conflicting top-level `OR` keys when q is also set.
  const filterAnds: Record<string, unknown>[] = [];

  if (topic.filter.subject?.length) {
    filterAnds.push({
      OR: topic.filter.subject.map((s) => ({ subject: { has: s } })),
    });
  }
  if (topic.filter.style?.length) {
    filterAnds.push({
      OR: topic.filter.style.map((s) => ({ style: { has: s } })),
    });
  }
  if (topic.filter.difficulty?.length) {
    filterAnds.push({ difficulty: { in: topic.filter.difficulty } });
  }
  if (topic.filter.scene?.length) {
    filterAnds.push({
      OR: topic.filter.scene.map((s) => ({ scene: { has: s } })),
    });
  }
  if (topic.filter.audience?.length) {
    filterAnds.push({
      OR: topic.filter.audience.map((a) => ({ audience: { has: a } })),
    });
  }
  if (topic.filter.q) {
    filterAnds.push({
      OR: [
        { title: { contains: topic.filter.q, mode: "insensitive" as const } },
        {
          description: {
            contains: topic.filter.q,
            mode: "insensitive" as const,
          },
        },
      ],
    });
  }

  const where = {
    status: "published" as const,
    ...(filterAnds.length === 1
      ? filterAnds[0]
      : filterAnds.length > 1
        ? { AND: filterAnds }
        : {}),
  };

  // Per-topic cache so different filters don't poison each other.
  // Tag `inspirations` lets the generate route revalidate on demand.
  const fetchTopic = unstable_cache(
    async () => {
      return prisma.inspiration.findMany({
        where,
        orderBy: { likesCount: "desc" },
        take: TOPIC_GRID_LIMIT,
      });
    },
    [`topic-grid-${topic.slug}`],
    { revalidate: 60, tags: ["inspirations"] },
  );

  let inspirations: Awaited<ReturnType<typeof fetchTopic>> = [];
  try {
    inspirations = await fetchTopic();
  } catch (error) {
    // Don't fail the page render on a transient DB issue — the SEO body
    // is the primary indexable content; the grid is an engagement layer.
    console.error(
      `[TopicInspirationGrid] failed to load inspirations for ${topic.slug}:`,
      error,
    );
  }

  const items = inspirations.map((item) => serializeInspiration(item));

  if (items.length === 0) {
    // No matches yet (small DB, niche topic) — surface the CTA alone so
    // the page never ships an empty grid section.
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-orange-50 p-6 text-center sm:p-8">
          <p className="text-sm font-semibold text-violet-700 sm:text-base">
            {t("emptyTitle")}
          </p>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            {t("emptySubtitle")}
          </p>
          <Link
            href="/generate"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
          >
            <span aria-hidden className="mr-1">
              ✨
            </span>
            {t("emptyCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">
          {t("gridTitle", { topic: topic.keyword })}
        </h2>
        <Link
          href="/explore"
          prefetch={false}
          className="text-xs font-semibold text-violet-600 hover:text-violet-800 sm:text-sm"
        >
          {t("seeAll")} →
        </Link>
      </div>
      <div className="grid gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <InspirationCard key={item.id} inspiration={item} />
        ))}
      </div>
    </div>
  );
}