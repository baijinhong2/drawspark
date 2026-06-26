"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { InspirationCard } from "@/components/InspirationCard";
import { IconSparkles, IconClock, IconSearch } from "@/components/icons";
import type { InspirationResponse } from "@/lib/types";

const BATCH_SIZE = 5;

type DoneEvent = { remaining: number; count: number };
type ErrorEvent = { error: string; message: string };
type StreamEvent =
  | { event: "item"; data: InspirationResponse }
  | { event: "done"; data: DoneEvent }
  | { event: "error"; data: ErrorEvent };

interface Props {
  /** Today's inspirations for the current visitor (server-side resolved by
   *  userId / sessionId). Empty when the visitor hasn't generated anything
   *  today — the results area then renders an empty state instead of a
   *  fallback sample. */
  initialInspirations: InspirationResponse[];
  /** Pre-fill text from `?q=` so topic-page CTAs that link to
   *  /generate?q=<prompt> land the user with the prompt already typed in.
   *  Read server-side to avoid the client-side Suspense boundary issue. */
  initialQuery?: string;
}

type QuickTagId =
  | "cute"
  | "easy"
  | "cool"
  | "sketch"
  | "bored"
  | "anime"
  | "animal"
  | "random";

interface QuickTag {
  id: QuickTagId;
  emoji: string;
  labelKey: string;
  /** Structured tag set sent to the API. `undefined` → fully random. */
  tags?: { style?: string; difficulty?: string; scene?: string; subject?: string };
}

const QUICK_TAGS: QuickTag[] = [
  { id: "cute", emoji: "✨", labelKey: "tagCute", tags: { style: "cute" } },
  {
    id: "easy",
    emoji: "⭐",
    labelKey: "tagEasy",
    tags: { difficulty: "easy" },
  },
  { id: "cool", emoji: "😎", labelKey: "tagCool", tags: { style: "cool" } },
  { id: "sketch", emoji: "✏️", labelKey: "tagSketch", tags: { style: "sketch" } },
  { id: "bored", emoji: "💭", labelKey: "tagBored", tags: { scene: "bored" } },
  { id: "anime", emoji: "🎌", labelKey: "tagAnime", tags: { subject: "anime" } },
  { id: "animal", emoji: "🐾", labelKey: "tagAnimal", tags: { subject: "animal" } },
  // random → no tags, fully random prompt
  { id: "random", emoji: "🎲", labelKey: "tagRandom" },
];

async function* parseSSEEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary: number;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let eventName = "message";
        let dataStr = "";
        for (const rawLine of block.split("\n")) {
          if (rawLine.startsWith("event:")) {
            eventName = rawLine.slice(6).trim();
          } else if (rawLine.startsWith("data:")) {
            dataStr = rawLine.slice(5).trim();
          }
        }
        if (!dataStr) continue;
        try {
          const data = JSON.parse(dataStr);
          yield { event: eventName, data } as StreamEvent;
        } catch {
          // skip malformed event
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // already released
    }
  }
}

export function GenerateClient({ initialInspirations, initialQuery = "" }: Props) {
  const t = useTranslations("generate");

  // Pre-fill the input box from the `?q=` value passed in by the server
  // component. One-shot on mount: re-navigating with a different ?q=
  // shouldn't re-overwrite what the user is currently typing.
  const [userInput, setUserInput] = useState(initialQuery);
  const [activeTag, setActiveTag] = useState<QuickTagId | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InspirationResponse[]>(initialInspirations);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamedCount, setStreamedCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  // Anchor element at the end of the results area — scrolled into view when
  // generation starts so the loading state (and the items streaming in) is
  // visible without the user having to chase them down the page.
  const loadingAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Focus the input when arriving from a topic CTA so the user can
    // either press Enter immediately or edit before generating.
    if (initialQuery) {
      const el = document.getElementById("gen-input") as HTMLInputElement | null;
      el?.focus();
      // Place caret at end so users can keep typing instead of
      // overwriting the prefix.
      const v = el?.value ?? "";
      el?.setSelectionRange(v.length, v.length);
    }
  }, [initialQuery]);

  // Auto-scroll to the loading anchor whenever loading turns on. `behavior:
  // "smooth"` so the page eases into place rather than jumping.
  useEffect(() => {
    if (loading) {
      // Defer one frame so the just-rendered skeleton is in the DOM before
      // we measure scroll position.
      requestAnimationFrame(() => {
        loadingAnchorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      });
    }
  }, [loading]);

  async function generate(opts: {
    tags?: QuickTag["tags"];
    input?: string;
    tagId?: QuickTagId | null;
  }) {
    if (loading) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);
    // Note: we deliberately do NOT clear `results` here. New inspirations are
    // appended to the existing list, so "Get more" stacks after history and
    // the user's earlier picks stay where they were.
    setStreamedCount(0);
    if (opts.tagId !== undefined) setActiveTag(opts.tagId);

    try {
      const res = await fetch("/api/inspirations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userInput: opts.input?.trim() || undefined,
          tags: opts.tags,
        }),
        signal: ctrl.signal,
      });

      const contentType = res.headers.get("Content-Type") || "";
      if (
        !res.ok ||
        !contentType.includes("text/event-stream") ||
        !res.body
      ) {
        let payload: { error?: string; message?: string } | null = null;
        try {
          payload = await res.json();
        } catch {
          // ignore parse error
        }
        if (payload?.error === "DAILY_LIMIT_REACHED") {
          setError(t("limitReached"));
          setRemaining(0);
        } else {
          setError(payload?.message || `Generation failed (${res.status})`);
        }
        return;
      }

      for await (const evt of parseSSEEvents(res.body.getReader(), ctrl.signal)) {
        if (ctrl.signal.aborted) break;
        if (evt.event === "item") {
          // New items land at the bottom — "Get more" stacks after history.
          setResults((prev) => [...prev, evt.data]);
          setStreamedCount((c) => c + 1);
        } else if (evt.event === "done") {
          setRemaining(evt.data.remaining);
        } else if (evt.event === "error") {
          setError(evt.data.message);
        }
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return;
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrimaryGenerate() {
    generate({ input: userInput, tagId: null });
  }

  function handleQuickTag(tag: QuickTag) {
    // Tag takes priority but text input is preserved (combined on backend).
    generate({ tags: tag.tags, input: userInput, tagId: tag.id });
  }

  function handleShuffle() {
    const tag = activeTag
      ? QUICK_TAGS.find((q) => q.id === activeTag)
      : undefined;
    generate({ tags: tag?.tags, input: userInput, tagId: tag?.id ?? null });
  }

  return (
    <div className="space-y-8">
      {/* ---- Search card: input row + quick tag chips below ---- */}
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm sm:p-6">
        <label htmlFor="gen-input" className="sr-only">
          {t("inputPlaceholder")}
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            id="gen-input"
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handlePrimaryGenerate();
            }}
            placeholder={t("inputPlaceholder")}
            disabled={loading}
            className="flex-1 rounded-full border border-violet-200 px-5 py-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handlePrimaryGenerate}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-7 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          >
            <IconSparkles className="size-4" />
            <span>{loading ? t("generating") : t("generateButton")}</span>
          </button>
        </div>

        {/* Quick tag chips — sit inside the search card, just under the input,
            so users see the shortcuts in the same visual context as the
            search box they're filling in. */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-2 text-xs font-semibold text-slate-500">
            {t("quickOptionsLabel")}
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const active = activeTag === tag.id && !loading;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleQuickTag(tag)}
                  disabled={loading}
                  aria-pressed={active}
                  className={
                    active
                      ? "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60"
                      : "inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  }
                >
                  <span aria-hidden>{tag.emoji}</span>
                  <span>{t(tag.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

{/* ---- Results ---- */}
      <div>
        {/* Heading + "Explore more" only render when there's actually
            something to show. Visitors with no generations today get a
            clean empty state below instead of a stale section header. */}
        {results.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              <span aria-hidden className="mr-1.5">💡</span>
              {t("todayInspiration")}
            </h2>
            {/* "Explore more" stays anchored to the heading — it's a navigational
                link, not a generative action. */}
            <Link
              href="/explore"
              prefetch={false}
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-violet-700"
            >
              {`${t("exploreMore")} →`}
            </Link>
          </div>
        )}

        {/* Empty state: nothing generated today yet. Tells the user the
            area below is where their results will appear once they click
            Generate (or pick a quick tag). */}
        {results.length === 0 && !loading && (
          <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">
              {t("emptyStateHeading")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t("emptyStateHint")}
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((item) => (
              <InspirationCard key={item.id} inspiration={item} />
            ))}
          </div>
        )}

        {/* Loading skeleton + status — anchored at the END of the results
            area. When the user clicks Generate we scroll this anchor into
            view so they watch the batch stream in below their last card. */}
        <div ref={loadingAnchorRef} className="mt-4">
          {loading && (
            <div
              aria-live="polite"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {/* Show the items already streamed + skeletons for the rest
                  of the in-flight batch, so the row never collapses to a
                  single column mid-stream. */}
              {Array.from({
                length: Math.max(BATCH_SIZE - streamedCount, 0),
              }).map((_, i) => (
                <div
                  key={`skel-${i}`}
                  className="h-56 animate-pulse rounded-2xl bg-violet-50"
                />
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            {loading && streamedCount > 0 && (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                {streamedCount} / {BATCH_SIZE}
              </span>
            )}
            {remaining !== null && !loading && (
              <span>
                {remaining === 0
                  ? t("limitReached")
                  : t("remaining", { count: remaining })}
              </span>
            )}
            {error && (
              <span className="font-medium text-rose-600">{error}</span>
            )}
          </div>

          {/* "Get more" only renders when the user has at least one card
              — clicking it without context would be confusing. */}
          {results.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleShuffle}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-5 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconSparkles className="size-4" />
                <span>{t("getMore")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}