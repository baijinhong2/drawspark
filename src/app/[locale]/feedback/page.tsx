import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "feedback" });
  return {
    title: { absolute: t("seoTitle") },
    description: t("seoDescription"),
    keywords: t("seoKeywords"),
    alternates: { canonical: absoluteUrl(locale, "/feedback") },
    openGraph: {
      title: t("seoTitle"),
      description: t("seoDescription"),
      url: absoluteUrl(locale, "/feedback"),
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

export default async function FeedbackPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("feedback");

  const wantToHear = t.raw("wantToHear.items") as Record<string, string>;
  const beforeSending = t.raw("beforeSending.items") as Record<string, string>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {t("h1")}
      </h1>

      <section className="mt-12 rounded-2xl border border-violet-100 bg-violet-50/40 p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("voiceMatters.title")}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-slate-700">
          {t("voiceMatters.content")}
        </p>
        <div className="mt-5 space-y-2 text-base text-slate-700">
          <p>
            <a
              href="mailto:support@drawspark.com"
              className="font-semibold text-violet-700 hover:text-violet-900 hover:underline"
            >
              {t("voiceMatters.email")}
            </a>
          </p>
          <p className="text-slate-600">{t("voiceMatters.responseTime")}</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("wantToHear.title")}
        </h2>
        <ul className="mt-4 space-y-3">
          {Object.values(wantToHear).map((item) => (
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

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("emailTemplate.title")}
        </h2>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 font-mono text-sm text-slate-700">
          <p>{t("emailTemplate.subject")}</p>
          <p className="mt-3 whitespace-pre-wrap">{t("emailTemplate.body")}</p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold text-slate-900">
          {t("beforeSending.title")}
        </h2>
        <ul className="mt-4 space-y-3">
          {Object.values(beforeSending).map((item) => (
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
    </div>
  );
}