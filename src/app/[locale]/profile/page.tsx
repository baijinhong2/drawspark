import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo";
import { ProfileClient } from "./ProfileClient";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profile" });
  return {
    title: t("title"),
    description: t("subtitle"),
    // Personal page — never index. External links still get a canonical
    // URL so any SEO equity stays attached to the brand domain.
    robots: { index: false, follow: true },
    alternates: { canonical: absoluteUrl(locale, "/profile") },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProfileClient />;
}