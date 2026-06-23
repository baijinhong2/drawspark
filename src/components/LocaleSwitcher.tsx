"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { ChevronDown, Check } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Locale switcher with country flags.
 *
 * Custom dropdown rather than `<select>` because:
 *  - Most browsers don't render flag emojis inside `<option>` reliably.
 *  - We want a consistent look across macOS / Windows / Linux.
 *
 * Uses Unicode flag emoji (regional indicator pairs). Each flag is built
 * from two ISO 3166-1 alpha-2 regional indicator code points.
 */
const localeMeta: Record<
  string,
  { flag: string; short: string; native: string }
> = {
  en: { flag: "🇺🇸", short: "EN", native: "English" },
  zh: { flag: "🇨🇳", short: "中文", native: "简体中文" },
  es: { flag: "🇪🇸", short: "ES", native: "Español" },
  ja: { flag: "🇯🇵", short: "JA", native: "日本語" },
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    setOpen(false);
    if (next !== locale) router.replace(pathname, { locale: next });
  }

  const current = localeMeta[locale] ?? localeMeta.en;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-2.5 text-sm font-medium text-violet-900 transition hover:border-violet-400 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        <span aria-hidden className="text-base leading-none">
          {current.flag}
        </span>
        <span className="hidden sm:inline">{current.short}</span>
        <ChevronDown
          aria-hidden
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg"
        >
          {routing.locales.map((loc) => {
            const meta = localeMeta[loc];
            if (!meta) return null;
            const active = loc === locale;
            return (
              <li key={loc} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => pick(loc)}
                  className={
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition " +
                    (active
                      ? "bg-violet-50 text-violet-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50")
                  }
                >
                  <span aria-hidden className="text-base leading-none">
                    {meta.flag}
                  </span>
                  <span className="flex-1">{meta.native}</span>
                  {active && (
                    <Check
                      aria-hidden
                      className="size-4 shrink-0 text-violet-600"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}