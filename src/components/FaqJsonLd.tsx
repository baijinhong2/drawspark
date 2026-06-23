import { getLocale, getTranslations } from "next-intl/server";

type FaqItem = {
  title?: string;
  description?: string;
};

/**
 * Emit a `FAQPage` JSON-LD block from the home page's SEO FAQ section.
 * Matches the Q&A list rendered by `SeoSections` so crawlers and on-page
 * content stay in sync.
 */
export async function FaqJsonLd() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "home" });

  if (!t.has("faq" as never)) return null;

  const faq = t.raw("faq" as never) as { content?: FaqItem[] } | undefined;
  const items = faq?.content ?? [];
  if (items.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items
      .filter((item) => item.title && item.description)
      .map((item) => ({
        "@type": "Question",
        name: item.title,
        acceptedAnswer: { "@type": "Answer", text: item.description },
      })),
  };

  return (
    <script
      id="faq-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}