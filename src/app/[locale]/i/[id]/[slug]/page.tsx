import { permanentRedirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

/**
 * Legacy detail URL: `/[locale]/i/{id}/{slug}` → `/[locale]/i/{id}`.
 *
 * We dropped the title-derived slug from the canonical detail route because
 * non-ASCII titles broke the `Location` HTTP header. Any pre-existing
 * external links (search engines, social shares, bookmarks) still point at
 * the old shape — this page 301s them to the new URL so we don't lose
 * inbound link equity and old share cards keep working.
 *
 * Implementation note: we accept the slug param to consume the path segment
 * (otherwise Next.js wouldn't match this route) but ignore its value. The
 * id is the only thing that matters.
 */
type Props = {
  params: Promise<{ locale: string; id: string; slug: string }>;
};

export default async function LegacyInspirationDetailRedirect({
  params,
}: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  // Use a hard-coded locale-prefixed path so next-intl's middleware doesn't
  // try to re-rewrite the redirect target.
  permanentRedirect(`/${locale}/i/${id}`);
}
