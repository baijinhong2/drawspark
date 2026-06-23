"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const COOKIE_NAME = "cookie_accepted";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function hasAcceptedCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${COOKIE_NAME}=`));
}

export function CookieBanner() {
  const t = useTranslations("cookieBanner");
  // Start hidden to avoid SSR/CSR mismatch (cookie check is browser-only).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasAcceptedCookie()) return;
    // Small delay so the banner doesn't flash during initial paint.
    const timer = window.setTimeout(() => setVisible(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  function accept() {
    document.cookie = `${COOKIE_NAME}=true; max-age=${ONE_YEAR_SECONDS}; path=/; SameSite=Lax`;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t("message")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-slate-700">
          <span aria-hidden>🍪 </span>
          {t("message")}
        </p>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/cookies"
            prefetch={false}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t("learnMore")}
          </Link>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
