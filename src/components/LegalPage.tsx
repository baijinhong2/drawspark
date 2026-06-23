import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, absoluteUrl } from "@/lib/seo";

type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "callout"; text: string };

type Section = { heading: string; blocks: Block[] };

type LegalDoc = "privacy" | "terms" | "cookies";

type Props = {
  doc: LegalDoc;
  params: Promise<{ locale: string }>;
};

export async function generateLegalMetadata({
  doc,
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: `legal.${doc}` });
  const title = t.has("seoTitle" as never)
    ? (t("seoTitle") as string)
    : (t("h1") as string);
  const description = t.has("seoDescription" as never)
    ? (t("seoDescription") as string)
    : undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: absoluteUrl(locale, `/${doc}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(locale, `/${doc}`),
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export async function LegalPage({ doc, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tRoot = await getTranslations({ locale, namespace: "legal" });
  const tDoc = await getTranslations({ locale, namespace: `legal.${doc}` });

  // Body content (sections) only lives in en.json — next-intl falls back to
  // the default locale (en) for missing keys, so this returns English content
  // for zh/ja/es. The English locale stays English.
  const sections = tDoc.raw("sections" as never) as Section[];

  const disclaimer = tDoc.has("disclaimer" as never)
    ? (tDoc("disclaimer") as string)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        {tDoc("h1")}
      </h1>

      <p className="mt-3 text-sm text-slate-500">
        {tRoot("lastUpdatedLabel")}: June 22, 2026
      </p>

      {disclaimer && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {disclaimer}
        </p>
      )}

      <div className="mt-10 space-y-12">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl font-bold text-slate-900">
              {section.heading}
            </h2>
            <div className="mt-4 space-y-4">
              {section.blocks.map((block, i) => (
                <BlockView key={i} block={block} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-16 border-t border-slate-200 pt-6 text-sm text-slate-500">
        {tRoot("contactLabel")}:{" "}
        <a
          href={`mailto:${tRoot("contactEmail")}`}
          className="text-violet-700 hover:underline"
        >
          {tRoot("contactEmail")}
        </a>
      </p>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "p":
      return (
        <p className="text-base leading-relaxed text-slate-700">{block.text}</p>
      );
    case "h3":
      return (
        <h3 className="mt-2 text-lg font-semibold text-slate-900">
          {block.text}
        </h3>
      );
    case "ul":
      return (
        <ul className="ml-4 list-disc space-y-2 text-slate-700">
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {block.rows.map((row, i) => (
                <tr key={i} className="text-slate-700">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="whitespace-pre-line px-4 py-3 align-top"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="leading-relaxed">
            <span aria-hidden>⚠️ </span>
            {block.text}
          </p>
        </div>
      );
  }
}
