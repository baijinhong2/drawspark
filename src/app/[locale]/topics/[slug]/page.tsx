import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SeoSections } from "@/components/SeoSections";
import { TopicPrimaryCta } from "@/components/TopicPrimaryCta";
import { TopicTopWidget } from "@/components/TopicTopWidget";
import { absoluteUrl, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { getSeoTopicBySlug, SEO_TOPIC_PAGES } from "@/lib/seo-pages";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

/**
 * Pre-render every Phase-1 SEO topic at build time so they're served as
 * static HTML with no TTFB hit on the Prisma query path. Adding a new
 * topic just means appending to the registry + i18n — `next build` picks
 * it up automatically.
 */
export function generateStaticParams() {
  return SEO_TOPIC_PAGES.map((p) => ({ slug: p.slug }));
}

/**
 * Build per-page `alternates.languages` for the head `<head>` block.
 * Every locale variant of this slug is registered so search engines can
 * serve the correct language version to users without self-discovering.
 */
function buildHreflang(slug: string, currentLocale: string) {
  const path = `/topics/${slug}`;
  const out: Record<string, string> = {};
  for (const loc of ["en", "zh", "es", "ja"] as const) {
    out[loc] = absoluteUrl(loc, path);
  }
  out["x-default"] = absoluteUrl("en", path);
  out[currentLocale] = absoluteUrl(currentLocale, path);
  return out;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const topic = getSeoTopicBySlug(slug);
  if (!topic) return {};

  const t = await getTranslations({ locale, namespace: topic.localeKey });
  if (!t.has("seoTitle" as never)) return {};

  const title = t("seoTitle");
  const description = t("seoDescription");
  const keywords = t.has("seoKeywords" as never)
    ? (t("seoKeywords") as string)
    : undefined;

  return {
    title: { absolute: title },
    description,
    keywords,
    alternates: {
      canonical: absoluteUrl(locale, `/topics/${slug}`),
      languages: buildHreflang(slug, locale),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(locale, `/topics/${slug}`),
      type: "website",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function TopicPage({ params }: Props) {
  const { locale, slug } = await params;
  const topic = getSeoTopicBySlug(slug);
  if (!topic) notFound();

  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: topic.localeKey });

  // Defensive: if the i18n namespace for this topic isn't populated yet,
  // surface a clean 404 rather than a half-broken page.
  if (!t.has("head1" as never)) notFound();

  return (
    <>
      {/*
* Layout per user spec:
        *   1. Functional widget on TOP
        *   2. H1 + subtitle + primary CTA in MIDDLE (CTA below subtitle)
        *   3. SEO content sections (head1 → faq) at BOTTOM
        * The SEO body's own head1 CTA is suppressed here because we
        * render our own primary CTA below the H1; rendering both would
        * duplicate the conversion surface and split the signal.
        */}
      <TopicTopWidget topic={topic} locale={locale} />

      <section className="border-b border-slate-100 bg-gradient-to-b from-white to-violet-50/50 px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {t("h1Title" as never)}
          </h1>
          {t.has("h1Subtitle" as never) && (
            <p className="mt-4 text-base text-slate-600 sm:text-lg">
              {t("h1Subtitle" as never)}
            </p>
          )}
          <div className="mt-6">
            <TopicPrimaryCta
              topic={topic}
              locale={locale}
              buttonText={t("heroCta" as never)}
              promptHint={t.has("heroPromptHint" as never) ? (t("heroPromptHint") as string) : ""}
            />
          </div>
        </div>
      </section>

      <SeoSections namespace={topic.localeKey} locale={locale} />
    </>
  );
}