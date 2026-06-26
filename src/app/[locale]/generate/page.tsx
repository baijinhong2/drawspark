import { cache } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { GenerateClient } from "@/components/GenerateClient";
import { SeoSections } from "@/components/SeoSections";
import { getCurrentUser } from "@/lib/auth";
import { serializeInspiration } from "@/lib/inspiration";
import { prisma } from "@/lib/prisma";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";
import { readSessionId } from "@/lib/session";
import type { InspirationResponse } from "@/lib/types";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "generate" });

  if (!t.has("seoTitle" as never)) {
    return {
      title: { absolute: t("title") },
      description: t("subtitle"),
      alternates: { canonical: absoluteUrl(locale, "/generate") },
      openGraph: {
        title: t("title"),
        description: t("subtitle"),
        url: absoluteUrl(locale, "/generate"),
        type: "website",
        images: [
          {
            url: DEFAULT_OG_IMAGE,
            width: 1200,
            height: 630,
            alt: t("title"),
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: t("title"),
        description: t("subtitle"),
        images: [DEFAULT_OG_IMAGE],
      },
    };
  }

  return {
    title: { absolute: t("seoTitle") },
    description: t("seoDescription"),
    keywords: t("seoKeywords"),
    alternates: { canonical: absoluteUrl(locale, "/generate") },
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDescription"),
      url: absoluteUrl(locale, "/generate"),
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
 * Today's inspirations for the current visitor — only what's been generated
 * since UTC midnight, scoped to their userId (logged-in) or sessionId
 * (anonymous cookie). Returned oldest-first so the newest item lands at the
 * bottom of the list and matches how new batches append during streaming.
 *
 * Returns `[]` when the visitor hasn't generated anything today — the
 * generate page should show a clean empty state in that case rather than
 * a default sample.
 */
const loadTodayInspirations = cache(
  async (userId: string | null, sessionId: string | null): Promise<InspirationResponse[]> => {
    if (!userId && !sessionId) return [];
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    try {
      const items = await prisma.inspiration.findMany({
        where: {
          createdAt: { gte: since },
          status: "published",
          isAiGenerated: true,
          OR: [
            userId ? { userId } : undefined,
            sessionId ? { sessionId } : undefined,
          ].filter(Boolean) as Array<Record<string, unknown>>,
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      return items.map((item) => serializeInspiration(item));
    } catch (error) {
      console.error("GeneratePage: failed to load today's inspirations", error);
      return [];
    }
  },
);

export default async function GeneratePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("generate");

  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;
  // Read the session cookie if it exists (don't mint one here — the
  // /api/inspirations/generate route handler does that on the first POST).
  // Anonymous visitors without a cookie yet see the empty state until they
  // actually generate something.
  const sessionId = userId ? null : await readSessionId();
  const initialInspirations = await loadTodayInspirations(userId, sessionId);
  const initialQuery = typeof q === "string" ? q : "";

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            <span aria-hidden className="mr-2">🎨</span>
            {t("title")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            {t("subtitle")}
          </p>
        </div>
        <GenerateClient
          initialInspirations={initialInspirations}
          initialQuery={initialQuery}
        />
      </div>
      <SeoSections namespace="generate" locale={locale} />
    </>
  );
}