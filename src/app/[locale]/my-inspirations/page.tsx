import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { MyInspirationsClient } from "@/components/MyInspirationsClient";
import { absoluteUrl } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myInspirations" });
  return {
    title: t("title"),
    description: t("subtitle"),
    // Personal page — never index, but still resolve to a canonical URL for
    // any external links that point here.
    robots: { index: false, follow: true },
    alternates: { canonical: absoluteUrl(locale, "/my-inspirations") },
  };
}

export default async function MyInspirationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MyInspirationsClient />;
}