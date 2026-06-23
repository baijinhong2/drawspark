import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { InspirationCard } from "@/components/InspirationCard";
import { FaqJsonLd } from "@/components/FaqJsonLd";
import { SeoSections } from "@/components/SeoSections";
import { Link } from "@/i18n/navigation";
import { SUBJECTS } from "@/lib/constants";
import { serializeInspiration } from "@/lib/inspiration";
import { prisma } from "@/lib/prisma";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  if (!t.has("seoTitle" as never)) {
    return {};
  }

  return {
    title: { absolute: t("seoTitle") },
    description: t("seoDescription"),
    keywords: t("seoKeywords"),
    alternates: { canonical: absoluteUrl(locale) },
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDescription"),
      url: absoluteUrl(locale),
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

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tEnum = await getTranslations("enums");

  let popular: ReturnType<typeof serializeInspiration>[] = [];
  try {
    const items = await prisma.inspiration.findMany({
      where: { status: "published" },
      orderBy: { likesCount: "desc" },
      take: 6,
    });
    popular = items.map((item) => serializeInspiration(item));
  } catch (error) {
    console.error("HomePage: failed to load popular inspirations", error);
  }

  const featuredSubjects = SUBJECTS.slice(0, 8);

  return (
    <>
      <FaqJsonLd />

      <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-500 to-orange-400 px-4 py-20 text-white sm:px-6 sm:py-28">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-60 w-60 rounded-full bg-orange-300/40 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-lg text-pretty text-violet-100 sm:text-xl">
            {t("heroSubtitle")}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/generate"
              className="rounded-full bg-white px-8 py-3.5 text-base font-bold text-violet-700 shadow-lg transition hover:bg-violet-50"
            >
              {t("ctaGenerate")}
            </Link>
            <Link
              href="/explore"
              className="rounded-full border-2 border-white/60 px-8 py-3.5 text-base font-bold text-white transition hover:bg-white/10"
            >
              {t("ctaExplore")}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">
              {t("popularTitle")}
            </h2>
            <Link
              href="/explore"
              className="text-sm font-semibold text-violet-600 hover:text-violet-800"
            >
              {t("viewAll")} →
            </Link>
          </div>

          {/* Single row of category chips — horizontal scroll on narrow screens
              so the row stays as one line and never wraps to a second row. */}
          <div
            className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
            role="navigation"
            aria-label={t("categoriesTitle")}
          >
            {featuredSubjects.map((subject) => (
              <Link
                key={subject}
                href={`/explore?subject=${subject}`}
                className="inline-flex shrink-0 items-center rounded-full border border-violet-200 bg-white px-4 py-1.5 text-sm font-semibold text-violet-800 transition hover:border-violet-400 hover:bg-violet-50"
              >
                {tEnum(`subject.${subject}`)}
              </Link>
            ))}
          </div>

          {popular.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((item) => (
                <InspirationCard key={item.id} inspiration={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      <SeoSections namespace="home" locale={locale} />
    </>
  );
}
