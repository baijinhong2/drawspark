"use client";

import { useCallback, useState } from "react";
import { InspirationCard } from "@/components/InspirationCard";
import { Link } from "@/i18n/navigation";
import type { InspirationResponse } from "@/lib/types";

const REEL_COUNT = 3;

/**
 * Slot-machine-style interactive widget for "scene" SEO pages
 * (things to draw when bored / what to draw when bored / stuff to draw
 * when your bored). Three reels pull together, each revealing a card.
 *
 * Why slot machine:
 *   - User came here bored and undecided → wants play, not browsing.
 *   - 3 simultaneous reveals > 1 card → more visual payoff per click.
 *   - Lever metaphor primes anticipation, like a gacha pull.
 */
export function LotteryDrawClient({
  pool,
  title,
  subtitle,
  leverButtonIdle,
  leverButtonSpinning,
  generateButtonText,
  generateHref,
  emptyHint,
}: {
  pool: InspirationResponse[];
  title: string;
  subtitle: string;
  leverButtonIdle: string;
  leverButtonSpinning: string;
  generateButtonText: string;
  generateHref: string;
  emptyHint: string;
}) {
  const [displayIds, setDisplayIds] = useState<string[]>(() =>
    pickThree(pool),
  );
  const [spinning, setSpinning] = useState(false);
  const [pullCount, setPullCount] = useState(0);

  const pullLever = useCallback(() => {
    if (spinning || pool.length === 0) return;
    setSpinning(true);

    // Mid-spin swap: change content after the blur animation starts.
    // Total cycle: 1.2s. Visual blur ramps in for ~400ms, holds,
    // then snaps to new cards at 800ms with a brief settle.
    window.setTimeout(() => {
      setDisplayIds(pickThree(pool));
    }, 700);

    window.setTimeout(() => {
      setSpinning(false);
      setPullCount((c) => c + 1);
    }, 1200);
  }, [pool, spinning]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <div className="mb-4 text-center">
        <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
      </div>

      {/* Reels */}
      <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-3 sm:gap-4">
        {displayIds.map((id, i) => {
          const card = pool.find((p) => p.id === id);
          return (
            <div
              key={`${id}-${i}`}
              className={`lottery-reel relative overflow-hidden rounded-2xl border-2 ${
                spinning
                  ? "border-violet-300 lottery-spinning"
                  : "border-violet-100"
              }`}
            >
              {card ? (
                <div
                  className={`${spinning ? "lottery-blur" : "lottery-settled"}`}
                >
                  <InspirationCard inspiration={card} />
                </div>
              ) : (
                <div className="h-64 animate-pulse bg-violet-50" />
              )}
              {/* Reel mask overlay — gives the slot-machine feel */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white/80 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white/80 to-transparent" />
            </div>
          );
        })}
      </div>

      {/* Lever — primary conversion point lives below in H1+CTA, not here */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={pullLever}
          disabled={spinning || pool.length < REEL_COUNT}
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-8 py-3 text-base font-extrabold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={leverButtonIdle}
        >
          <span
            aria-hidden
            className={`text-xl transition-transform ${spinning ? "lottery-lever-down" : "lottery-lever-idle"}`}
          >
            🎰
          </span>
          <span>{spinning ? leverButtonSpinning : leverButtonIdle}</span>
          {pullCount > 0 && !spinning && (
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold">
              {pullCount}
            </span>
          )}
        </button>
      </div>

      <style jsx>{`
        @keyframes lottery-spin-blur {
          0% { filter: blur(0); transform: scale(1); }
          40% { filter: blur(8px); transform: scale(0.97); }
          70% { filter: blur(12px); transform: scale(0.95); }
          100% { filter: blur(0); transform: scale(1); }
        }
        @keyframes lottery-lever-yank {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(-25deg) translateY(-2px); }
          70% { transform: rotate(20deg) translateY(4px); }
        }
        :global(.lottery-blur) {
          animation: lottery-spin-blur 700ms ease-in-out;
        }
        :global(.lottery-settled) {
          animation: lottery-spin-blur 500ms ease-out;
        }
        :global(.lottery-lever-idle) {
          display: inline-block;
          animation: lottery-lever-yank 2400ms ease-in-out infinite;
        }
        :global(.lottery-lever-down) {
          display: inline-block;
          transform: rotate(45deg) translateY(6px);
          transition: transform 200ms ease-out;
        }
      `}</style>
    </div>
  );
}

/** Pick 3 distinct random card IDs from the pool. */
function pickThree(pool: InspirationResponse[]): string[] {
  if (pool.length === 0) return [];
  if (pool.length <= REEL_COUNT) {
    return pool.map((p) => p.id);
  }
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, REEL_COUNT).map((p) => p.id);
}