import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GalleryClient } from "@/components/GalleryClient";
import { SeoSections } from "@/components/SeoSections";
import { getCurrentUser } from "@/lib/auth";
import { serializeInspiration } from "@/lib/inspiration";
import { prisma } from "@/lib/prisma";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";
import type { InspirationResponse } from "@/lib/types";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "explore" });

  if (!t.has("seoTitle" as never)) {
    return {
      title: { absolute: t("title") },
      description: t("subtitle"),
      alternates: { canonical: absoluteUrl(locale, "/explore") },
    };
  }

  return {
    title: { absolute: t("seoTitle") },
    description: t("seoDescription"),
    keywords: t("seoKeywords"),
    alternates: { canonical: absoluteUrl(locale, "/explore") },
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDescription"),
      url: absoluteUrl(locale, "/explore"),
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: t("seoTitle"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("seoTitle"),
      description: t("seoDescription"),
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

/**
 * Public, cacheable inspirations query.
 *
 * - Same `(subject, style)` filter across visitors within the revalidate
 *   window returns the cached result instead of re-running the SQL.
 * - `currentUser` is intentionally NOT part of the cache key — favorite state
 *   is fetched separately per request below.
 * - Tag `inspirations` lets an inspiration-create route revalidate this
 *   entry on demand if/when freshness matters more than throughput.
 */
const fetchPublicInspirations = unstable_cache(
  async (subject: string | undefined, style: string | undefined) => {
    const where = {
      status: "published" as const,
      ...(subject ? { subject: subject as never } : {}),
      ...(style ? { style: style as never } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.inspiration.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.inspiration.count({ where }),
    ]);
    return { items, total };
  },
  ["explore-public-inspirations"],
  { revalidate: 60, tags: ["inspirations"] },
);

/**
 * Wrap getCurrentUser in React.cache so the same request never reads the
 * session cookie twice (layout, page, header etc. all call it).
 */
const getCurrentUserCached = cache(async () => getCurrentUser());

async function ExploreContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const subject =
    typeof searchParams.subject === "string" ? searchParams.subject : undefined;
  const style =
    typeof searchParams.style === "string" ? searchParams.style : undefined;

  let initialInspirations: InspirationResponse[] = [];
  let initialHasMore = false;

  try {
    const { items, total } = await fetchPublicInspirations(subject, style);

    const currentUser = await getCurrentUserCached();
    let favoriteIds = new Set<string>();
    if (currentUser && items.length > 0) {
      const favs = await prisma.favorite.findMany({
        where: {
          userId: currentUser.id,
          inspirationId: { in: items.map((i) => i.id) },
        },
        select: { inspirationId: true },
      });
      favoriteIds = new Set(favs.map((f) => f.inspirationId));
    }

    initialInspirations = items.map((item) =>
      serializeInspiration(item, { favorited: favoriteIds.has(item.id) }),
    );
    initialHasMore = total > 20;
  } catch (error) {
    console.error("ExplorePage: failed to load inspirations", error);
  }

  return (
    <GalleryClient
      initialInspirations={initialInspirations}
      initialHasMore={initialHasMore}
    />
  );
}

export default async function ExplorePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const resolvedSearchParams = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("explore");

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
        <Suspense
          fallback={
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl bg-violet-50"
                />
              ))}
            </div>
          }
        >
          {/* key = serialized searchParams so soft-nav between footer
              category links remounts GalleryClient and re-reads filters
              from the new URL. */}
          <ExploreContent
            key={JSON.stringify(resolvedSearchParams)}
            searchParams={resolvedSearchParams}
          />
        </Suspense>
        <div className="mt-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-slate-600">{t("subtitle")}</p>
        </div>
      </div>
      <SeoSections namespace="explore" locale={locale} />
    </>
  );
}