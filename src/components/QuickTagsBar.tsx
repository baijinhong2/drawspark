"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  QUICK_TAGS,
  QUICK_TAGS_BATCH_SIZE,
  pickRandomTags,
  type QuickAction,
  type QuickTag,
} from "@/lib/quickTags";

interface QuickTagsBarProps {
  onApply: (action: QuickAction) => void;
}

function makeSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

// Estimated widths (px) — used as a budget when measuring overflow with
// getBoundingClientRect. Tags always render at their natural size; we just
// decide how many to *show*.
const TAG_EST_WIDTH = 88;
const REFRESH_BTN_WIDTH = 32;
const ROW_GAP = 6;

export function QuickTagsBar({ onApply }: QuickTagsBarProps) {
  const tEnum = useTranslations("enums");
  const tQuick = useTranslations("quickTags");
  const tGallery = useTranslations("explore");

  // Seeded batch on first render — same on server + first client render.
  const [seed, setSeed] = useState(() => 1);
  const [tags, setTags] = useState<QuickTag[]>(() =>
    pickRandomTags(QUICK_TAGS, QUICK_TAGS_BATCH_SIZE, 1),
  );

  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [visibleCount, setVisibleCount] = useState(QUICK_TAGS_BATCH_SIZE);

  useEffect(() => {
    setSeed(makeSeed());
    setTags(pickRandomTags(QUICK_TAGS, QUICK_TAGS_BATCH_SIZE, makeSeed()));
  }, []);

  // After mount + whenever tags change, measure how many fit on one row and
  // shrink visibleCount if the row is overflowing. The refresh button + a
  // small gap is always reserved.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const available = el.clientWidth - REFRESH_BTN_WIDTH - ROW_GAP;
      if (available <= 0) {
        setVisibleCount(0);
        return;
      }
      let consumed = 0;
      let count = 0;
      for (const tag of tags) {
        const node = itemRefs.current.get(tag.id);
        const w = node ? node.getBoundingClientRect().width : TAG_EST_WIDTH;
        const need = w + (count === 0 ? 0 : ROW_GAP);
        if (consumed + need > available) break;
        consumed += need;
        count += 1;
      }
      setVisibleCount(count);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tags]);

  function refresh() {
    const next = makeSeed();
    setSeed(next);
    setTags(pickRandomTags(QUICK_TAGS, QUICK_TAGS_BATCH_SIZE, next));
  }

  function labelFor(tag: QuickTag): string {
    if (tag.namespace === "enums") return tEnum(tag.labelKey);
    return tQuick(tag.labelKey);
  }

  const hidden = Math.max(0, tags.length - visibleCount);
  const visibleTags = tags.slice(0, visibleCount);

  return (
    <div
      ref={scrollerRef}
      className="-mx-1 mb-2 flex items-center gap-1.5 overflow-hidden px-1"
    >
      {visibleTags.map((tag) => (
        <button
          key={tag.id}
          ref={(node) => {
            if (node) itemRefs.current.set(tag.id, node);
            else itemRefs.current.delete(tag.id);
          }}
          type="button"
          onClick={() => onApply(tag.action)}
          className="inline-flex flex-shrink-0 items-center gap-1 rounded-full border border-violet-100 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 active:translate-y-0"
        >
          <span aria-hidden>{tag.icon}</span>
          <span className="whitespace-nowrap">{labelFor(tag)}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={refresh}
        aria-label={tGallery("refreshTags")}
        title={
          hidden > 0
            ? `${tGallery("refreshTags")} (+${hidden})`
            : tGallery("refreshTags")
        }
        className="relative ml-auto inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:rotate-180 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      >
        <span aria-hidden>🔄</span>
        {hidden > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white ring-1 ring-white">
            +{hidden}
          </span>
        )}
      </button>
    </div>
  );
}