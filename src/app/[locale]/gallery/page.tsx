import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: "Explore Drawing Ideas",
    robots: { index: false, follow: true },
    alternates: {
      canonical: `/${locale === "en" ? "" : locale}/explore`,
    },
  };
}

/**
 * Legacy `/gallery` URL — permanently redirect (308) to `/explore` so
 * existing links and SEO equity follow the rename.
 */
export default async function GalleryLegacyRedirect({ params }: Props) {
  const { locale } = await params;
  const prefix = locale === "en" ? "" : `/${locale}`;
  permanentRedirect(`${prefix}/explore`);
}