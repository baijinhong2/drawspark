"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FilterDrawer } from "@/components/FilterDrawer";
import { InspirationCard } from "@/components/InspirationCard";
import { PromptInput } from "@/components/PromptInput";
import {
  AUDIENCES,
  DIFFICULTIES,
  MOODS,
  SCENES,
  SORT_OPTIONS,
  STYLES,
  SUBJECTS,
  TIME_ESTIMATES,
} from "@/lib/constants";
import {
  EMPTY_FILTERS,
  parseList,
  type MultiFilters,
  type QuickAction,
} from "@/lib/quickTags";
import type { InspirationResponse } from "@/lib/types";

interface GalleryClientProps {
  initialInspirations: InspirationResponse[];
  initialHasMore: boolean;
}

/**
 * Public entry — wraps the inner implementation in <Suspense> because
 * `useSearchParams()` inside must live behind a Suspense boundary in
 * Next.js 16 (otherwise prerender fails on static pages).
 */
export function GalleryClient(props: GalleryClientProps) {
  return (
    <Suspense fallback={<GalleryFallback />}>
      <GalleryClientInner {...props} />
    </Suspense>
  );
}

function GalleryFallback() {
  // Same skeleton the inner component renders on first fetch — keeps the
  // visual experience continuous whether Suspense falls back or the
  // initial fetch is still in flight.
  return (
    <div className="grid gap-4 pb-32 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-2xl bg-violet-50"
        />
      ))}
    </div>
  );
}

function GalleryClientInner({
  initialInspirations,
  initialHasMore,
}: GalleryClientProps) {
  const t = useTranslations("explore");
  const searchParams = useSearchParams();

  const [inspirations, setInspirations] =
    useState<InspirationResponse[]>(initialInspirations);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);

  const initialSort = searchParams.get("sort") || "latest";
  const [sort, setSort] = useState(initialSort);
  const [q, setQ] = useState(searchParams.get("q") || "");

  const [filters, setFilters] = useState<MultiFilters>({
    subject: parseList(searchParams.get("subject"), SUBJECTS),
    style: parseList(searchParams.get("style"), STYLES),
    difficulty: parseList(searchParams.get("difficulty"), DIFFICULTIES),
    mood: parseList(searchParams.get("mood"), MOODS),
    scene: parseList(searchParams.get("scene"), SCENES),
    time_estimate: parseList(searchParams.get("time_estimate"), TIME_ESTIMATES),
    audience: parseList(searchParams.get("audience"), AUDIENCES),
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // "Go generate" hint behaviour:
  //   - After the user scrolls past ~3 viewports, the hint expands on the
  //     right side with a collapse (×) button.
  //   - If the user keeps scrolling down, OR explicitly dismisses via the
  //     × button, the hint collapses to a small icon pinned to the edge.
  //   - Tapping the collapsed icon jumps to /generate.
  //
  // Tracked off scroll position (not `page`) so it survives page reloads and
  // works even on the first paint of items.
  const [hintExpanded, setHintExpanded] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const expandedScrolledRef = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (typeof window === "undefined") return;
      const scrollY = window.scrollY;

      // Expand after ~3 viewports.
      if (!expandedScrolledRef.current) {
        if (scrollY > window.innerHeight * 3) {
          expandedScrolledRef.current = true;
          setHintExpanded(true);
        }
        return;
      }

      // After expanded: collapse on continued downward scroll past another
      // viewport. (One viewport gap from the expand threshold avoids
      // immediately hiding the hint the moment it appears.)
      if (
        hintExpanded &&
        scrollY > window.innerHeight * 4
      ) {
        setHintExpanded(false);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hintExpanded]);

  // Once expanded, also auto-collapse when the user explicitly dismisses.
  function handleDismiss() {
    setHintDismissed(true);
    setHintExpanded(false);
  }

  const totalSelected = useMemo(
    () => Object.values(filters).reduce((sum, arr) => sum + arr.length, 0),
    [filters],
  );

  const buildQueryString = useCallback(
    (
      activeFilters: MultiFilters,
      sortValue: string,
      qValue: string,
      pageNum: number,
    ) => {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: "20",
      });
      if (sortValue) params.set("sort", sortValue);
      if (qValue) params.set("q", qValue);
      for (const key of [
        "subject",
        "style",
        "difficulty",
        "mood",
        "scene",
        "time_estimate",
        "audience",
      ] as const) {
        if (activeFilters[key].length > 0) {
          params.set(key, activeFilters[key].join(","));
        }
      }
      return params;
    },
    [],
  );

  const fetchWithFilters = useCallback(
    async (
      activeFilters: MultiFilters,
      sortValue: string,
      qValue: string,
      pageNum: number,
      append = false,
    ) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      const params = buildQueryString(activeFilters, sortValue, qValue, pageNum);
      try {
        const res = await fetch(`/api/inspirations?${params}`);
        const data = await res.json();
        if (data.success) {
          const items = data.data.inspirations as InspirationResponse[];
          setInspirations((prev) => (append ? [...prev, ...items] : items));
          setPage(pageNum);
          setHasMore(pageNum < data.data.pagination.totalPages);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQueryString],
  );

  function loadMore() {
    if (loadingMore || !hasMore) return;
    fetchWithFilters(filters, sort, q, page + 1, true);
  }

  // Infinite scroll: trigger loadMore when sentinel scrolls into view.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e.isIntersecting) loadMore();
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore, page, filters, sort, q]);

  function handleSortChange(nextSort: string) {
    setSort(nextSort);
    fetchWithFilters(filters, nextSort, q, 1, false);
  }

  function handleSearch(nextQ: string) {
    setQ(nextQ);
    fetchWithFilters(filters, sort, nextQ, 1, false);
  }

  function handleDrawerConfirm(staging: MultiFilters) {
    setFilters(staging);
    setDrawerOpen(false);
    fetchWithFilters(staging, sort, q, 1, false);
  }

  function handleDrawerClear() {
    setFilters(EMPTY_FILTERS);
    setDrawerOpen(false);
    fetchWithFilters(EMPTY_FILTERS, sort, q, 1, false);
  }

  function handleQuickAction(action: QuickAction) {
    if (action.kind === "filter") {
      const next: MultiFilters = { ...filters, [action.key]: [action.value] };
      setFilters(next);
      fetchWithFilters(next, sort, q, 1, false);
    } else if (action.kind === "sort") {
      handleSortChange(action.value);
    } else if (action.kind === "random") {
      setFilters(EMPTY_FILTERS);
      setQ("");
      setSort("latest");
      fetchWithFilters(EMPTY_FILTERS, "latest", "", 1, false);
    }
  }

  return (
    <div className="space-y-4 pb-32">
      {loading && inspirations.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-2xl bg-violet-50"
            />
          ))}
        </div>
      ) : inspirations.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-slate-500">
            {q || totalSelected > 0 ? t("noResults") : t("emptyMessage")}
          </p>
          {(q || totalSelected > 0) && (
            <div className="mt-5">
              <Link
                href="/generate"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:shadow-lg"
              >
                <span aria-hidden>✨</span>
                <span>{t("noResultsGoGenerate")}</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inspirations.map((item) => (
            <InspirationCard key={item.id} inspiration={item} />
          ))}
        </div>
      )}

      {/* Floating "go generate" hint — three states:
          1. Hidden (before 3 viewports of scroll)
          2. Expanded (full pill + collapse button) — visible from 3 to ~4 viewports
          3. Collapsed (small icon pinned to right edge) — auto on further scroll
             or when the user dismisses. Clicking either expanded or collapsed
             state navigates to /generate. */}
      {inspirations.length > 0 && (hintExpanded || hintDismissed) && (
        <div className="pointer-events-none fixed bottom-24 right-4 z-30 sm:bottom-20 sm:right-6">
          {hintExpanded ? (
            <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 p-1.5 pl-4 shadow-lg ring-1 ring-white/30">
              <Link
                href="/generate"
                prefetch={false}
                className="text-sm font-semibold text-white"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden>✨</span>
                  <span>{t("scrollHintGoGenerate")}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label={t("scrollHintCollapse")}
                className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30"
              >
                <span aria-hidden>×</span>
              </button>
            </div>
          ) : (
            <Link
              href="/generate"
              prefetch={false}
              aria-label={t("scrollHintGoGenerate")}
              className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-orange-500 text-lg text-white shadow-lg ring-1 ring-white/30 transition hover:scale-105 hover:shadow-xl"
            >
              <span aria-hidden>✨</span>
            </Link>
          )}
        </div>
      )}

      {/* Sentinel + status — drives infinite scroll + tail indicator */}
      <div ref={sentinelRef} className="flex justify-center pt-4">
        {loadingMore && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
            <span>{t("loadingMore")}</span>
          </div>
        )}
        {!hasMore && inspirations.length > 0 && !loading && (
          <p className="text-xs text-slate-400">{t("endOfList")}</p>
        )}
      </div>

      <PromptInput
        sort={sort}
        onSortChange={handleSortChange}
        q={q}
        onSearch={handleSearch}
        activeFilterCount={totalSelected}
        onFilterClick={() => setDrawerOpen((v) => !v)}
        filterOpen={drawerOpen}
        onQuickApply={handleQuickAction}
        searching={loading}
      />

      <FilterDrawer
        open={drawerOpen}
        applied={filters}
        onConfirm={handleDrawerConfirm}
        onCancel={() => setDrawerOpen(false)}
        onClear={handleDrawerClear}
      />
    </div>
  );
}