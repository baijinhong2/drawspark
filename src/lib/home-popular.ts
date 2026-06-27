import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serializeInspiration } from "@/lib/inspiration";
import type { InspirationResponse } from "@/lib/types";

/**
 * Server-side inspiration fetch for the homepage "Popular Inspirations" grid.
 *
 * Ordering policy (mirrors the public-facing description in the home copy):
 *   1. likes desc — primary engagement signal
 *   2. favorites desc
 *   3. shares desc
 *   4. copies desc
 *   5. createdAt desc — final tie-breaker; also acts as the natural
 *      fallback when a fresh batch has zero engagement on every metric
 *      (e.g. immediately after a bulk reseed), so the grid still shows
 *      the 6 most recent items instead of an empty section.
 *
 * Results are wrapped in `unstable_cache` keyed by a static slug so
 * repeated requests within the 60s revalidate window reuse the same SQL
 * plan; the `inspirations` tag lets the generate route bust this cache
 * on demand via `revalidateTag("inspirations")`, so newly created rows
 * show up immediately without waiting for the 60s window.
 *
 * The fetcher returns serialized plain objects (no Prisma internals),
 * safe to pass across the server→client boundary and safe to store in
 * the Next.js data cache.
 */
const fetchHomePopular = unstable_cache(
  async (): Promise<InspirationResponse[]> => {
    const items = await prisma.inspiration.findMany({
      where: { status: "published" },
      orderBy: [
        { likesCount: "desc" },
        { favoritesCount: "desc" },
        { sharesCount: "desc" },
        { copiesCount: "desc" },
        { createdAt: "desc" },
      ],
      take: 6,
    });
    return items.map((item) => serializeInspiration(item));
  },
  ["home-popular-v1"],
  { revalidate: 60, tags: ["inspirations"] },
);

export function getHomePopularInspirations(): Promise<InspirationResponse[]> {
  return fetchHomePopular();
}
