"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { InspirationCard } from "@/components/InspirationCard";
import { Link } from "@/i18n/navigation";
import type { InspirationResponse } from "@/lib/types";

type Vibe = "any" | "cute" | "cool" | "easy" | "aesthetic";

const VIBE_ORDER: Vibe[] = ["any", "cute", "cool", "easy", "aesthetic"];

const VIBE_STYLES: Record<Exclude<Vibe, "any" | "easy">, string[]> = {
  cute: ["cute", "kawaii"],
  cool: ["cool", "dark", "graffiti", "trippy"],
  aesthetic: ["aesthetic", "minimalist", "vintage", "dreamy"],
};

/**
 * Single-card-focused widget for "head-term" and "hub" SEO pages
 * (e.g. "what should i draw", "drawing prompts", "drawing inspiration",
 * "art drawings"). The user came to be *inspired*, not browse — so we
 * put ONE big featured card in the center of attention and let them
 * flip through with a "Surprise Me" tap.
 *
 * Vibe chips (cute / cool / easy / aesthetic) filter the pool client-side
 * so the user can pull a card that matches the mood they're in.
 */
export function SingleCardRevealClient({
  pool,
  title,
  subtitle,
  generateButtonText,
  generateHref,
  emptyHint,
  vibeAny,
  vibeCute,
  vibeCool,
  vibeEasy,
  vibeAesthetic,
}: {
  pool: InspirationResponse[];
  title: string;
  subtitle: string;
  generateButtonText: string;
  generateHref: string;
  emptyHint: string;
  vibeAny: string;
  vibeCute: string;
  vibeCool: string;
  vibeEasy: string;
  vibeAesthetic: string;
}) {
  const [vibe, setVibe] = useState<Vibe>("any");
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);

  // Vibe-filtered pool
  const filtered = useMemo(() => {
    if (vibe === "any") return pool;
    if (vibe === "easy") {
      return pool.filter((p) => p.difficulty === "easy" || p.difficulty === "beginner");
    }
    const styles = VIBE_STYLES[vibe];
    return pool.filter((p) => p.style?.some((s) => styles.includes(s)));
  }, [pool, vibe]);

  // Pick initial + when pool/vibe changes
  useEffect(() => {
    if (filtered.length === 0) {
      setPickedId(null);
      return;
    }
    setPickedId(filtered[0].id);
    setCycle(0);
  }, [filtered]);

  const pickRandom = useCallback(() => {
    if (filtered.length === 0) return;
    const current = filtered.find((p) => p.id === pickedId);
    const others = filtered.filter((p) => p.id !== current?.id);
    const next = others.length > 0
      ? others[Math.floor(Math.random() * others.length)]
      : filtered[Math.floor(Math.random() * filtered.length)];
    setPickedId(next.id);
    setCycle((c) => c + 1);
  }, [filtered, pickedId]);

  const current = filtered.find((p) => p.id === pickedId);

  if (pool.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-orange-50 p-6 text-center sm:p-8">
          <p className="text-sm font-semibold text-violet-700 sm:text-base">
            {emptyHint}
          </p>
          <Link
            href={generateHref}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
          >
            <span aria-hidden className="mr-1">✨</span>
            {generateButtonText}
          </Link>
        </div>
      </div>
    );
  }

  const vibeLabels: Record<Vibe, string> = {
    any: vibeAny,
    cute: vibeCute,
    cool: vibeCool,
    easy: vibeEasy,
    aesthetic: vibeAesthetic,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
        </div>

        {/* Vibe chips */}
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Vibe">
          {VIBE_ORDER.map((v) => {
            const active = vibe === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setVibe(v)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition sm:text-sm ${
                  active
                    ? "border-violet-600 bg-violet-600 text-white shadow-sm"
                    : "border-violet-200 bg-white text-slate-700 hover:border-violet-400 hover:bg-violet-50"
                }`}
              >
                {vibeLabels[v]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured card — single, big, centered */}
      {current ? (
        <div
          key={`${current.id}-${cycle}`}
          className="mx-auto max-w-md animate-revealFade sm:max-w-lg"
        >
          <InspirationCard inspiration={current} />
        </div>
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 p-8 text-center">
          <p className="text-sm text-slate-600">
            No {vibe} inspirations yet — try another vibe.
          </p>
        </div>
      )}

      {/* Surprise me — the primary conversion CTA lives below in H1+CTA, not here */}
      <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <button
          type="button"
          onClick={pickRandom}
          disabled={filtered.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-200 bg-white px-6 py-2.5 text-sm font-bold text-violet-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden>✨</span>
          <span>Surprise Me</span>
        </button>
      </div>
    </div>
  );
}