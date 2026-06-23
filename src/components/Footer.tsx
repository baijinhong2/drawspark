import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Site-wide footer. Rendered by `[locale]/layout.tsx`, so it appears on every
 * page (existing and future) under `[locale]/` without further wiring.
 */
export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-violet-100 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Brand (left) + link columns (right) */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-16">
          {/* Left: brand + tagline */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-bold text-slate-900"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-orange-400 text-sm text-white">
                ✦
              </span>
              <span className="text-lg tracking-tight">DrawSpark</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-slate-600">{t("tagline")}</p>
          </div>

          {/* Right: four link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <FooterColumn title={t("quickLinks")}>
              <FooterLink href="/">{t("home")}</FooterLink>
              <FooterLink href="/generate">{t("generator")}</FooterLink>
              <FooterLink href="/explore">{t("explore")}</FooterLink>
            </FooterColumn>

            <FooterColumn title={t("categories")}>
              <FooterLink href="/explore?style=cute">{t("catCute")}</FooterLink>
              <FooterLink href="/explore?style=cool">{t("catCool")}</FooterLink>
              <FooterLink href="/explore?style=simple">{t("catSimple")}</FooterLink>
              <FooterLink href="/explore?style=sketch">{t("catSketch")}</FooterLink>
              <FooterLink href="/explore?subject=animal">
                {t("catAnimal")}
              </FooterLink>
              <FooterLink href="/explore?subject=tattoo">
                {t("catTattoo")}
              </FooterLink>
              <FooterLink href="/explore?subject=anime">
                {t("catAnime")}
              </FooterLink>
              <FooterLink href="/explore?subject=fantasy">
                {t("catFantasy")}
              </FooterLink>
            </FooterColumn>

            <FooterColumn title={t("popularTopics")}>
              <FooterLink href="/easy-things-to-draw">
                {t("popularEasyThings")}
              </FooterLink>
              <FooterLink href="/things-to-draw-when-bored">
                {t("popularBored")}
              </FooterLink>
              <FooterLink href="/cute-tattoo-designs">
                {t("popularTattoo")}
              </FooterLink>
              <FooterLink href="/drawing-ideas-for-kids">
                {t("popularKids")}
              </FooterLink>
            </FooterColumn>

            <FooterColumn title={t("support")}>
              <FooterLink href="/about">{t("about")}</FooterLink>
              <FooterLink href="/contact">{t("contact")}</FooterLink>
              <FooterLink href="/feedback">{t("feedback")}</FooterLink>
              <FooterLink href="/faq">{t("faq")}</FooterLink>
            </FooterColumn>
          </div>
        </div>

        {/* Bottom row: copyright + legal links */}
        <div className="mt-10 flex flex-col items-start gap-3 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("rights", { year })}</p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              prefetch={false}
              className="transition hover:text-violet-600"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/terms"
              prefetch={false}
              className="transition hover:text-violet-600"
            >
              {t("terms")}
            </Link>
            <Link
              href="/cookies"
              prefetch={false}
              className="transition hover:text-violet-600"
            >
              {t("cookies")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900">
        {title}
      </h3>
      <ul className="space-y-2 text-sm text-slate-600">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  // Footer sits below the fold — opt out of next/link's viewport prefetch
  // so we don't speculatively download 18 page bundles the user may never
  // visit. Hover/focus still triggers client-side navigation.
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        className="transition hover:text-violet-600"
      >
        {children}
      </Link>
    </li>
  );
}