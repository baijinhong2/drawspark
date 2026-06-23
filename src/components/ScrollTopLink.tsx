"use client";

import { MouseEvent } from "react";
import { Link, usePathname } from "@/i18n/navigation";

const LOCALES = ["en", "zh", "es", "ja"] as const;

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

/**
 * Like next-intl `<Link>`, but when the target URL resolves to the current
 * page (modulo locale prefix) it intercepts the click and smooth-scrolls to
 * the top of the page instead of triggering a navigation/reload.
 */
export function ScrollTopLink({ href, className, children }: Props) {
  const pathname = usePathname() || "/";

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // Let the browser handle modifier-clicks (open-in-new-tab etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    if (normalize(pathname) === normalize(href)) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Clear any in-page hash so the URL stays clean.
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

/**
 * Normalize a path by stripping an optional leading locale segment so
 * `/explore`, `explore`, and `/zh/explore` all compare equal.
 */
function normalize(p: string): string {
  const trimmed = p.startsWith("/") ? p.slice(1) : p;
  const segs = trimmed.split("/").filter(Boolean);
  if (segs.length > 0 && (LOCALES as readonly string[]).includes(segs[0])) {
    segs.shift();
  }
  return "/" + segs.join("/");
}