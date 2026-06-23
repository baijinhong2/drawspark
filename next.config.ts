import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // svg-captcha loads a font via __dirname at module init — bundling breaks that.
  // Keep it as a runtime require so the original path resolves correctly.
  serverExternalPackages: ["svg-captcha"],
};

export default withNextIntl(nextConfig);
