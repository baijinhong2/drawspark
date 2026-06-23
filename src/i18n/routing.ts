import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh", "es", "ja"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  /**
   * Disable automatic locale detection from the `Accept-Language` header.
   *
   * Default behaviour would 302-redirect `https://drawspark.art/` to
   * `/zh` for a Chinese browser, which is wrong for two reasons:
   *   1. Search engines should always see the canonical English URL at
   *      the site root so they have a stable index entry.
   *   2. Visitors should land on English by default and discover the
   *      language switcher (or the in-page BrowserLanguagePrompt banner)
   *      rather than being silently redirected.
   *
   * Users can still switch locales via the LocaleSwitcher in the header.
   */
  localeDetection: false,
});
