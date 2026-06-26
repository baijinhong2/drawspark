import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serializeInspiration } from "@/lib/inspiration";
import type { SeoTopicPage } from "@/lib/seo-pages";
import type { InspirationResponse } from "@/lib/types";

/**
 * Server-side inspiration fetch used by every top-of-page SEO widget.
 *
 * Builds the Prisma `where` from the registry's per-topic filter
 * (subject / style / scene / audience via list-field `has`, difficulty
 * via scalar enum `in`, plus an optional text-search across title /
 * description). Results are wrapped in `unstable_cache` keyed by slug
 * so repeated requests within the 60s revalidate window reuse the same
 * SQL plan; the `inspirations` tag lets the generate route revalidate
 * on demand.
 *
 * Returns a serialized plain-object list (no Prisma internals), so the
 * result is safe to pass across the server→client boundary.
 */
export async function fetchInspirationsForTopic(
  topic: SeoTopicPage,
  limit = 20,
): Promise<InspirationResponse[]> {
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

  const fetcher = unstable_cache(
    async () => {
      return prisma.inspiration.findMany({
        where,
        orderBy: { likesCount: "desc" },
        take: limit,
      });
    },
    [`topic-widget-${topic.slug}-${limit}`],
    { revalidate: 60, tags: ["inspirations"] },
  );

  try {
    const items = await fetcher();
    return items.map((item) => serializeInspiration(item));
  } catch (error) {
    console.error(
      `[fetchInspirationsForTopic] failed for ${topic.slug}:`,
      error,
    );
    return [];
  }
}