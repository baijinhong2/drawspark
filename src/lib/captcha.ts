import path from "node:path";
import svgCaptcha from "svg-captcha";

// In-memory captcha store. Maps captchaId -> expected text (lowercased).
// MVP-only: clears on server restart. Entries expire automatically.
const CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes
const store = new Map<string, { code: string; expiresAt: number }>();

// svg-captcha does not bundle its font on npm, so we keep a copy at /fonts
// and load it once at module init.
const FONT_PATH = path.join(process.cwd(), "fonts", "Comismsh.ttf");
try {
  svgCaptcha.loadFont(FONT_PATH);
} catch (err) {
  console.error(`[captcha] failed to load font at ${FONT_PATH}:`, err);
}

export type CaptchaPayload = {
  captchaId: string;
  svg: string; // raw SVG markup; safe to embed directly in HTML
};

// Periodic sweep to prevent unbounded growth in long-running processes.
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(id);
  }
}, 60 * 1000).unref?.();

export function generateCaptcha(): CaptchaPayload {
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: "0oO1ilI", // avoid ambiguous chars
    noise: 2,
    color: true,
    background: "#f8fafc",
  });
  const captchaId = crypto.randomUUID();
  store.set(captchaId, {
    code: captcha.text.toLowerCase(),
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
  });
  return { captchaId, svg: captcha.data };
}

/**
 * Verify a captcha. Returns true on success and deletes the entry (one-time use).
 * Returns false on missing/expired/wrong code.
 */
export function verifyCaptcha(captchaId: string, code: string): boolean {
  const entry = store.get(captchaId);
  if (!entry) return false;
  store.delete(captchaId); // single-use — also prevents replays
  if (entry.expiresAt <= Date.now()) return false;
  return entry.code === code.trim().toLowerCase();
}