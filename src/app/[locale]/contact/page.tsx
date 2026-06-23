import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { ScrollTopLink } from "@/components/ScrollTopLink";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return {
    title: { absolute: t("seoTitle") },
    description: t("seoDescription"),
    keywords: t("seoKeywords"),
    alternates: { canonical: absoluteUrl(locale, "/contact") },
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDescription"),
      url: absoluteUrl(locale, "/contact"),
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

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  const helpItems = t.raw("helpWith.items") as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {t("h1")}
      </h1>

      <section className="mt-12 rounded-2xl border border-violet-100 bg-violet-50/40 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("getInTouch.title")}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700">
          {t("getInTouch.content")}
        </p>
        <div className="mt-5 space-y-2 text-base text-slate-700">
          <p>
            <a
              href="mailto:support@drawspark.com"
              className="font-semibold text-violet-700 hover:text-violet-900 hover:underline"
            >
              {t("getInTouch.email")}
            </a>
          </p>
          <p className="text-slate-600">{t("getInTouch.responseTime")}</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("helpWith.title")}
        </h2>
        <ul className="mt-4 space-y-3">
          {Object.values(helpItems).map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-slate-700"
            >
              <span className="mt-1 text-violet-500">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">
          {t("beforeContact.title")}
        </h2>
        <p className="mt-3 text-base text-slate-700">
          {t("beforeContact.content")}
        </p>
        <div className="mt-5">
          <ScrollTopLink
            href="/faq"
            className="inline-flex items-center justify-center rounded-full border-2 border-violet-600 px-6 py-2.5 text-sm font-bold text-violet-700 transition hover:bg-violet-50"
          >
            {t("beforeContact.cta")} →
          </ScrollTopLink>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("stayConnected.title")}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700">
          {t("stayConnected.content")}
        </p>
        <div className="mt-5 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-6 text-center text-sm text-violet-400">
          [{t("stayConnected.placeholder")}]
        </div>
      </section>
    </div>
  );
}