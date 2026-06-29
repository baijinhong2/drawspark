"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Footer column for the SEO topic links. Rendered as a Client Component
 * because the list has grown past the visual threshold and needs a
 * collapse/expand toggle.
 *
 * Server-side label resolution happens in the parent (`Footer.tsx`); this
 * component only renders pre-resolved strings. Avoids re-running the
 * `topics.<slug>.footerLabel` translation lookup on the client.
 *
 * Threshold: when the topic count exceeds `COLLAPSE_THRESHOLD`, the first
 * `COLLAPSE_THRESHOLD` entries render by default and the rest are hidden
 * behind a "Show N more" / "Show less" toggle. ≤ threshold → no toggle,
 * render all entries straight through.
 */
const COLLAPSE_THRESHOLD = 20;

export type FooterTopicLink = {
  slug: string;
  label: string;
};

export function FooterTopicsColumn({
  title,
  topics,
}: {
  title: string;
  topics: FooterTopicLink[];
}) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations("footer");
  const listId = useId();

  const needsCollapse = topics.length > COLLAPSE_THRESHOLD;
  const visible =
    needsCollapse && !expanded
      ? topics.slice(0, COLLAPSE_THRESHOLD)
      : topics;
  const hiddenCount = topics.length - COLLAPSE_THRESHOLD;

  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-900">
        {title}
      </h3>
      <ul
        id={listId}
        className="space-y-2 text-sm text-slate-600"
      >
        {visible.map((topic) => (
          <li key={topic.slug}>
            <Link
              href={`/topics/${topic.slug}`}
              prefetch={false}
              className="transition hover:text-violet-600"
            >
              {topic.label}
            </Link>
          </li>
        ))}
        {needsCollapse && (
          <li>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={listId}
              className="mt-1 inline-flex items-center gap-1 rounded text-xs font-medium text-violet-600 transition hover:text-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              {expanded ? t("showLess") : t("showMore", { count: hiddenCount })}
              <span aria-hidden="true" className="text-[0.7rem]">
                {expanded ? "▴" : "▾"}
              </span>
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
