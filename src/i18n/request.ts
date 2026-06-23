import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  // For non-default locales, deep-merge the default-locale messages on top so
  // missing keys fall back to English instead of throwing MISSING_MESSAGE.
  // This lets us ship new content (e.g. SEO sections) in English first and
  // translate later without breaking the UI in zh/es/ja.
  let resolved = messages;
  if (locale !== routing.defaultLocale) {
    const fallback = (await import(`../../messages/${routing.defaultLocale}.json`)).default;
    resolved = deepMerge(messages, fallback);
  }

  return {
    locale,
    messages: resolved,
  };
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge `fallback` into `target`. `target` keys win on conflicts.
 * Arrays are replaced, not concatenated.
 */
function deepMerge(target: unknown, fallback: unknown): unknown {
  if (!isPlainObject(fallback)) return target;
  if (!isPlainObject(target)) return fallback;
  const result: Record<string, unknown> = { ...fallback };
  for (const key of Object.keys(target)) {
    result[key] = deepMerge(target[key], fallback[key]);
  }
  return result;
}