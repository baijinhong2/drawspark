import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollTopLink } from "@/components/ScrollTopLink";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  if (!t.has("seoTitle" as never)) {
    return {
      title: t("title"),
      description: t("description"),
      alternates: { canonical: absoluteUrl(locale, "/about") },
    };
  }
  return {
    title: { absolute: t("seoTitle") },
    description: t("seoDescription"),
    keywords: t("seoKeywords"),
    alternates: { canonical: absoluteUrl(locale, "/about") },
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDescription"),
      url: absoluteUrl(locale, "/about"),
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: t("seoTitle") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("seoTitle"),
      description: t("seoDescription"),
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");

  const whyItems = t.raw("why.items") as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {t("h1")}
      </h1>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">{t("whatIs.title")}</h2>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          {t("whatIs.content")}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">{t("mission.title")}</h2>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          {t("mission.content")}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">{t("why.title")}</h2>
        <ul className="mt-4 space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-6">
          {Object.values(whyItems).map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-slate-700"
            >
              <span className="mt-1 text-violet-500">✦</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("commitment.title")}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-700">
          {t("commitment.content")}
        </p>
      </section>

      <section className="mt-12 rounded-2xl bg-gradient-to-br from-violet-600 to-orange-500 px-6 py-10 text-center text-white sm:px-10">
        <h2 className="text-2xl font-bold">{t("getStarted.title")}</h2>
        <p className="mt-3 text-violet-100">{t("getStarted.content")}</p>
        <div className="mt-6">
          <ScrollTopLink
            href="/generate"
            className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-violet-700 shadow-md transition hover:bg-violet-50"
          >
            {t("getStarted.cta")}
          </ScrollTopLink>
        </div>
      </section>
    </div>
  );
}