import type { Metadata } from "next";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { InspirationView } from "./InspirationView";
import { RelatedInspirations } from "./RelatedInspirations";
import { loadCommentTree } from "@/lib/comments";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { serializeInspiration } from "@/lib/inspiration";
import { inspirationSlug } from "@/lib/slug";
import type { InspirationResponse } from "@/lib/types";
import { DEFAULT_OG_IMAGE, LOCALES, SITE_URL, localePath } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; id: string; slug: string }>;
};

/**
 * `getCurrentUser` reads the auth cookie and hits the DB for the user row.
 * Both `generateMetadata` and the page need it, so we wrap with React's
 * `cache()` to dedupe the call within a single request render.
 */
const getCurrentUserCached = cache(async () => getCurrentUser());

/**
 * Detail-page inspiration query.
 *
 * We fetch one row by id (status=published). Slug is not used for lookup
 * — it's a hint for SEO and is canonicalized below.
 *
 * Wrapped with React's `cache()` so both `generateMetadata` and the page
 * share one invocation per request (previously this ran twice).
 */
const loadInspiration = cache(
  async (
    id: string,
    viewerId: string | null,
  ): Promise<{
    inspiration: InspirationResponse | null;
    isAiGenerated: boolean;
    authorName: string | null;
  }> => {
    const prisma = getPrisma();
    // Run inspiration row + (if logged-in) favorite lookup in parallel —
    // they're independent reads with no FK joins between them.
    const rowPromise = prisma.inspiration.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        subject: true,
        style: true,
        difficulty: true,
        mood: true,
        scene: true,
        timeEstimate: true,
        audience: true,
        tags: true,
        likesCount: true,
        copiesCount: true,
        sharesCount: true,
        favoritesCount: true,
        commentsCount: true,
        isAiGenerated: true,
        createdAt: true,
        status: true,
        userId: true,
        user: { select: { displayName: true } },
      },
    });

    const favPromise: Promise<{ id: string } | null> = viewerId
      ? prisma.favorite.findUnique({
          where: {
            userId_inspirationId: { userId: viewerId, inspirationId: id },
          },
          select: { id: true },
        })
      : Promise.resolve(null);

    const [row, fav] = await Promise.all([rowPromise, favPromise]);

    if (!row) {
      return { inspiration: null, isAiGenerated: true, authorName: null };
    }

    // Visibility: published is public; drafts visible only to owner.
    if (row.status !== "published" && row.userId !== viewerId) {
      return { inspiration: null, isAiGenerated: true, authorName: null };
    }

    return {
      inspiration: serializeInspiration(row, { favorited: !!fav }),
      isAiGenerated: row.isAiGenerated,
      authorName: row.user?.displayName ?? null,
    };
  },
);

/**
 * Related inspirations: same subject first, then style, dedup, exclude self.
 * Capped to N. Pulled via Prisma directly (not unstable_cache) since these
 * are per-detail and freshness beats throughput here.
 */
async function loadRelated(
  inspiration: InspirationResponse,
  limit = 6,
): Promise<InspirationResponse[]> {
  const prisma = getPrisma();
  const rows = await prisma.inspiration.findMany({
    where: {
      status: "published",
      id: { not: inspiration.id },
      OR: [
        { subject: inspiration.subject as never },
        { style: inspiration.style as never },
      ],
    },
    orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }],
    take: limit * 2, // overshoot so dedup + headroom
    select: {
      id: true,
      title: true,
      description: true,
      subject: true,
      style: true,
      difficulty: true,
      mood: true,
      scene: true,
      timeEstimate: true,
      audience: true,
      tags: true,
      likesCount: true,
      copiesCount: true,
      sharesCount: true,
      favoritesCount: true,
      commentsCount: true,
      createdAt: true,
    },
  });
  return rows
    .slice(0, limit)
    .map((row) => serializeInspiration(row, { favorited: false }));
}

// ---------- Metadata ----------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "detail" });

  const viewer = await getCurrentUserCached();
  const { inspiration } = await loadInspiration(id, viewer?.id ?? null);
  if (!inspiration) {
    return {
      title: t("notFoundTitle"),
      robots: { index: false, follow: true },
    };
  }

  // Title: "{title} - Drawing Idea" — layout appends " | DrawSpark".
  const baseTitle = inspiration.title;
  const fullTitle =
    baseTitle.length > 45
      ? `${baseTitle.slice(0, 45).trim()}… - Drawing Idea`
      : `${baseTitle} - Drawing Idea`;

  // Description: first 60-80 chars of description + AI-generated tag line.
  const desc = inspiration.description ?? "";
  const lead = desc.length > 80 ? `${desc.slice(0, 80).trim()}…` : desc;
  const tail = ` Free AI-generated drawing idea from DrawSpark. Get inspired with ${inspiration.title} and thousands of other drawing prompts.`;
  const description = `${lead}${tail}`.slice(0, 160);

  // Keywords: title words + tags + generic + enums + brand.
  const titleWords = inspiration.title
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)
    .map((w) => `${w} drawing`);
  const keywords = [
    ...titleWords,
    ...inspiration.tags.slice(0, 6),
    "drawing idea",
    "things to draw",
    "drawing inspiration",
    "AI drawing prompt",
    `${inspiration.style} drawing`,
    `${inspiration.subject} drawing`,
    "DrawSpark",
  ].join(", ");

  const path = `/i/${inspiration.id}/${inspirationSlug(inspiration.title)}`;
  const canonicalUrl = `${SITE_URL}${localePath(locale, path)}`;

  /**
   * Pair every locale version of this detail page with each other so Google
   * knows they are translations of the same content. Only emit hreflang for
   * the 4 supported locales — never invent URLs.
   */
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[loc] = `${SITE_URL}${localePath(loc, path)}`;
  }
  languages["x-default"] = `${SITE_URL}${localePath("en", path)}`;

  return {
    title: fullTitle,
    description,
    keywords,
    openGraph: {
      title: fullTitle,
      description,
      type: "article",
      url: canonicalUrl,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

// ---------- Page ----------

export default async function InspirationDetailPage({ params }: Props) {
  const { locale, id, slug } = await params;
  setRequestLocale(locale);

  const viewer = await getCurrentUserCached();

  // Phase 1 (parallel round-trip):
  //   - loadInspiration reads the inspiration row + user join
  //   - loadCommentTree reads comments + comment-user join
  // These are independent (no FK between them aside from inspirationId, which
  // we already know). The DB round-trip dominates — running them in parallel
  // halves the wall time vs sequential calls.
  const [inspirationResult, comments] = await Promise.all([
    loadInspiration(id, viewer?.id ?? null),
    loadCommentTree(id),
  ]);

  const { inspiration, isAiGenerated, authorName } = inspirationResult;
  if (!inspiration) notFound();

  // Canonicalize slug. If the URL slug doesn't match the title-derived one,
  // permanently redirect to the canonical URL.
  const expected = inspirationSlug(inspiration.title);
  if (slug !== expected) {
    permanentRedirect(`/i/${id}/${expected}`);
  }

  // Phase 2 (parallel round-trip, after we have the inspiration's
  // subject/style): the related-inspirations query.
  const related = await loadRelated(inspiration);

  return (
    <>
      <Suspense fallback={null}>
        <InspirationView
          inspiration={inspiration}
          initialFavorited={!!viewer && (inspiration.favorited ?? false)}
          initialComments={comments}
          similarHref={related.map((r) => ({ id: r.id, title: r.title }))}
        />
      </Suspense>

      <RelatedInspirations
        inspirations={related}
        authorLabel={
          isAiGenerated ? "AI Generated" : authorName ?? "Community"
        }
      />
    </>
  );
}