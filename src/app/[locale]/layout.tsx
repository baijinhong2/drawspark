import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/components/AuthProvider";
import { BrowserLanguagePrompt } from "@/components/BrowserLanguagePrompt";
import { CookieBanner } from "@/components/CookieBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { routing } from "@/i18n/routing";
import { LOCALES, SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  // Each page sets its own absolute title (already branded) so we don't
  // double-append "| DrawSpark" via the template.
  const fallbackTitle = t.has("seoTitle" as never) ? t("seoTitle") : "DrawSpark";
  const fallbackDescription = t.has("seoDescription" as never)
    ? t("seoDescription")
    : "AI drawing ideas generator";

  /**
   * hreflang map. Each entry is the locale's own path, e.g. `/` for English
   * (because `localePrefix: "as-needed"` drops the `/en` prefix), `/zh`,
   * `/es`, `/ja`. `x-default` is the English version, which Google uses as
   * the catch-all when no other locale matches.
   *
   * Next.js pairs these with `metadataBase` (set in the root layout) so the
   * emitted `<link rel="alternate" hreflang="...">` tags get full URLs.
   */
  const languages: Record<string, string> = {};
  for (const loc of LOCALES) {
    languages[loc] = loc === "en" ? "/" : `/${loc}`;
  }
  languages["x-default"] = "/";

  return {
    title: {
      template: "%s | DrawSpark",
      default: fallbackTitle,
    },
    description: fallbackDescription,
    alternates: { languages },
    openGraph: {
      type: "website",
      siteName: "DrawSpark",
      locale: locale === "zh" ? "zh_CN" : locale === "ja" ? "ja_JP" : locale === "es" ? "es_ES" : "en_US",
      url: locale === "en" ? SITE_URL : `${SITE_URL}/${locale}`,
    },
    twitter: {
      card: "summary_large_image",
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        <BrowserLanguagePrompt />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieBanner />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
