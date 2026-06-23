import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { GenerateClient } from "@/components/GenerateClient";
import { SeoSections } from "@/components/SeoSections";
import { serializeInspiration } from "@/lib/inspiration";
import { prisma } from "@/lib/prisma";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";
import type { InspirationResponse } from "@/lib/types";

type Props = { params: Promise<{ locale: string }> };

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
 * Cacheable, language-agnostic list of popular inspirations to render on
 * first paint before the user generates anything.
 *
 * Same hot/warm path as explore: same query within the revalidate window
 * returns from cache, so the page can stream the H1 + 5 inspiration cards
 * quickly on every visit.
 */
const fetchPopularInspirations = unstable_cache(
  async () => {
    const items = await prisma.inspiration.findMany({
      where: { status: "published" },
      orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }],
      take: 5,
    });
    return items;
  },
  ["generate-popular-inspirations"],
  { revalidate: 60, tags: ["inspirations"] },
);

const loadFallbackInspirations = cache(async (): Promise<InspirationResponse[]> => {
  try {
    const items = await fetchPopularInspirations();
    return items.map((item) => serializeInspiration(item));
  } catch (error) {
    console.error("GeneratePage: failed to load popular inspirations", error);
    return [];
  }
});

export default async function GeneratePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("generate");

  const initialInspirations = await loadFallbackInspirations();

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
        <GenerateClient initialInspirations={initialInspirations} />
      </div>
      <SeoSections namespace="generate" locale={locale} />
    </>
  );
}