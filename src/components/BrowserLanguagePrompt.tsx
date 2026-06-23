"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Per-locale display metadata. Kept local to this component (the LocaleSwitcher
 * has its own copy) because the prompt needs the *target* language's native
 * name regardless of which locale the user is currently viewing.
 */
const localeMeta: Record<string, { flag: string; native: string }> = {
  en: { flag: "🇺🇸", native: "English" },
  zh: { flag: "🇨🇳", native: "简体中文" },
  es: { flag: "🇪🇸", native: "Español" },
  ja: { flag: "🇯🇵", native: "日本語" },
};

const SESSION_KEY = "drawspark:lang-prompt-dismissed";

/**
 * Top-of-page banner that detects the browser's preferred language and offers
 * to switch. Only shown when:
 *   1. The browser's primary language tag maps to a *supported* locale, and
 *   2. That locale differs from the one currently being viewed.
 *
 * Dismissal is per-session (sessionStorage) so the prompt reappears on the
 * next visit / new tab. We deliberately avoid persisting to a cookie or
 * localStorage — the user should be free to re-evaluate on every visit.
 */
export function BrowserLanguagePrompt() {
  const t = useTranslations("langPrompt");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    // Already acted on this session — stay quiet.
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // navigator.language is e.g. "zh-CN", "en-US", "ja". Only the primary
    // subtag matters for our locale list.
    const raw = navigator.language ?? "";
    const primary = raw.toLowerCase().split("-")[0];
    if (!primary) return;

    const supported = (routing.locales as readonly string[]).includes(
      primary,
    );
    if (!supported) return;
    if (primary === locale) return;

    setTarget(primary);
  }, [locale]);

  function remember() {
    sessionStorage.setItem(SESSION_KEY, "1");
    setTarget(null);
  }

  function handleSwitch() {
    if (!target) return;
    remember();
    router.replace(pathname, { locale: target });
  }

  if (!target) return null;

  const meta = localeMeta[target];
  const currentMeta = localeMeta[locale];
  // If we ever get a tag without a meta entry, hide the flag gracefully.
  const flag = meta?.flag ?? "🌐";
  const langName = meta?.native ?? target.toUpperCase();
  const currentName = currentMeta?.native ?? locale.toUpperCase();

  return (
    <div
      role="region"
      aria-label={t("message", { lang: langName })}
      className="relative z-40 border-b border-violet-200 bg-gradient-to-r from-violet-50 via-white to-orange-50"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <span aria-hidden className="text-base leading-none">
            {flag}
          </span>
          <span>
            {t("message", { lang: langName })}
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={remember}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t("dismiss", { current: currentName })}
          </button>
          <button
            type="button"
            onClick={handleSwitch}
            className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-violet-700"
          >
            {t("switch", { lang: langName })}
          </button>
        </div>
      </div>
    </div>
  );
}
