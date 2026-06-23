/**
 * Compact number formatter for counts (likes, copies, shares, etc.).
 *
 * Rules
 * ─────
 *   < 1 000       → "999"
 *   1 000 – 9 999 → "1.2K" (one decimal)
 *   10 000 – 999 999 → "23K" (no decimal — precision rarely matters past 10K)
 *   1 000 000 – 9 999 999 → "1.2M" (one decimal)
 *   ≥ 10 000 000   → "23M" (no decimal)
 *
 * Always rounds half-up via `Math.round` after `toFixed`. Returns a string
 * so callers can drop it directly into JSX without further coercion.
 */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.trunc(n));

  if (abs < 1_000_000) {
    const thousands = n / 1000;
    const decimals = abs < 10_000 ? 1 : 0;
    return `${trimZero(thousands.toFixed(decimals))}K`;
  }

  const millions = n / 1_000_000;
  const decimals = abs < 10_000_000 ? 1 : 0;
  return `${trimZero(millions.toFixed(decimals))}M`;
}

/** Strip a trailing ".0" so "12.0K" → "12K". */
function trimZero(s: string): string {
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}