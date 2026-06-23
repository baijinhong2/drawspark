import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return {
    title: { absolute: t("seoTitle") },
    description: t("seoDescription"),
    keywords: t("seoKeywords"),
    alternates: { canonical: absoluteUrl(locale, "/faq") },
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDescription"),
      url: absoluteUrl(locale, "/faq"),
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

type FaqItem = { q: string; a: string };

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("faq");

  const items = t.raw("items") as Record<string, FaqItem>;
  const orderedItems = Object.values(items);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {t("h1")}
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-base text-slate-600 sm:text-lg">
        {t("subtitle")}
      </p>

      <div className="mt-12 space-y-3">
        {orderedItems.map((item, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-violet-100 bg-violet-50/30 p-5 transition open:bg-white open:shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
              <span className="flex items-baseline gap-3">
                <span className="text-violet-500">{i + 1}.</span>
                <span>{item.q}</span>
              </span>
              <span className="text-2xl text-violet-600 transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}