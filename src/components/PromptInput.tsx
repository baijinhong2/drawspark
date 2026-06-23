"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { QuickTagsBar } from "@/components/QuickTagsBar";
import {
  IconClock,
  IconLike,
  IconCopy,
  IconFavorite,
  IconSearch,
  IconSliders,
} from "@/components/icons";
import { SORT_OPTIONS } from "@/lib/constants";
import type { QuickAction } from "@/lib/quickTags";

// 27 prompts (mirrors `prompts` translation namespace size). Used as a
// render-time cap, NOT for picking the initial prompt.
const PROMPT_COUNT = 27;

interface PromptInputProps {
  sort: string;
  onSortChange: (sort: string) => void;
  q: string;
  onSearch: (q: string) => void;
  activeFilterCount: number;
  onFilterClick: () => void;
  filterOpen: boolean;
  onQuickApply: (action: QuickAction) => void;
  /** True while the parent is fetching results — shows a spinner on the
   *  search button and disables it to prevent duplicate submits. */
  searching?: boolean;
}

const ROTATION_INTERVAL_MS = 3500;

// One icon per sort option — keeps the button compact and label-free.
const SORT_ICONS: Record<string, React.ReactNode> = {
  latest: <IconClock className="size-5" />,
  likes: <IconLike className="size-5" />,
  copies: <IconCopy className="size-5" />,
  favorites: <IconFavorite className="size-5" />,
};

export function PromptInput({
  sort,
  onSortChange,
  q,
  onSearch,
  activeFilterCount,
  onFilterClick,
  filterOpen,
  onQuickApply,
  searching = false,
}: PromptInputProps) {
  const t = useTranslations("explore");
  const tPrompts = useTranslations("prompts");

  const [qDraft, setQDraft] = useState(q);
  // Start with a deterministic index on the server pass to avoid hydration
  // mismatch; pick the random one on the client after mount.
  const [promptIndex, setPromptIndex] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const lastIndex = useRef(promptIndex);

  useEffect(() => {
    // First random prompt after hydration.
    setPromptIndex(Math.floor(Math.random() * PROMPT_COUNT));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => setQDraft(q), [q]);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase("out");
      const fadeOut = setTimeout(() => {
        let next = lastIndex.current;
        while (next === lastIndex.current) {
          next = Math.floor(Math.random() * PROMPT_COUNT);
        }
        lastIndex.current = next;
        setPromptIndex(next);
        setPhase("in");
      }, 220);
      return () => clearTimeout(fadeOut);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(qDraft.trim());
  }

  function cycleSort() {
    const idx = SORT_OPTIONS.indexOf(sort as (typeof SORT_OPTIONS)[number]);
    const next =
      SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length] ?? SORT_OPTIONS[0];
    onSortChange(next);
  }

  const sortLabel = (s: string) =>
    s === "latest"
      ? t("sortLatest")
      : s === "likes"
        ? t("sortLikes")
        : s === "copies"
          ? t("sortCopies")
          : t("sortFavorites");

  const currentIcon = SORT_ICONS[sort] ?? "🕐";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-4 sm:px-6 sm:pb-6">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-violet-200 bg-white p-2 shadow-2xl shadow-violet-900/20 ring-1 ring-violet-100 sm:p-2.5">
        {/* Quick tags — single row above the search bar */}
        <QuickTagsBar onApply={onQuickApply} />

        {/* Search bar */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 sm:gap-3"
        >
          {/* Left: sort cycle button — same square size as filter button */}
          <button
            type="button"
            onClick={cycleSort}
            aria-label={`${t("sortLabel")}: ${sortLabel(sort)}`}
            title={sortLabel(sort)}
            className="inline-flex h-10 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-xl transition hover:border-violet-300 hover:bg-violet-100 active:scale-95 sm:w-14"
          >
            <span aria-hidden>{currentIcon}</span>
          </button>

          {/* Middle: search input with rotating placeholder + submit button inside */}
          <div className="relative flex-1">
            {qDraft.length === 0 && (
              <div
                key={promptIndex}
                aria-hidden
                className={
                  "pointer-events-none absolute inset-0 flex items-center px-3 text-sm text-slate-400 transition-opacity duration-200 sm:px-4 " +
                  (phase === "in" ? "opacity-100" : "opacity-0")
                }
              >
                {tPrompts(promptIndex.toString())}
              </div>
            )}
            <input
              type="search"
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              aria-label={t("searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-3 pr-11 text-sm focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 sm:pl-4 sm:pr-12"
            />
            {/* Submit button — anchored inside the input on the right */}
            <button
              type="submit"
              aria-label={searching ? t("searching") : t("searchButton")}
              disabled={searching}
              className={
                "absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl transition disabled:opacity-60 sm:w-12 " +
                (searching
                  ? "text-violet-700"
                  : "text-slate-500 hover:bg-violet-50 hover:text-violet-700")
              }
            >
              {searching ? (
                <span
                  aria-hidden
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-300 border-t-violet-700"
                />
              ) : (
                <IconSearch className="size-4 sm:size-5" />
              )}
            </button>
          </div>

          {/* Filter button — moved to the far right of the bar */}
          <button
            type="button"
            onClick={onFilterClick}
            aria-label={t("filterLabel")}
            aria-expanded={filterOpen}
            className={
              "relative inline-flex h-10 w-12 flex-shrink-0 items-center justify-center rounded-xl text-base transition sm:w-14 " +
              (filterOpen || activeFilterCount > 0
                ? "bg-violet-600 text-white shadow-md hover:bg-violet-700"
                : "border border-violet-100 bg-white text-violet-700 hover:border-violet-300 hover:bg-violet-50")
            }
          >
            <IconSliders className="size-5" />
            {activeFilterCount > 0 && (
              <span
                className={
                  "absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ring-2 ring-white " +
                  (filterOpen
                    ? "bg-white text-violet-700"
                    : "bg-violet-600 text-white")
                }
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}