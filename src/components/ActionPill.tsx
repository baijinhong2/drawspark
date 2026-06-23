"use client";

import { forwardRef } from "react";
import { Link } from "@/i18n/navigation";

export type ActionVariant = "like" | "favorite" | "share" | "comment" | "copy";
export type ActionState = "default" | "active" | "success" | "error";

interface ActionPillOwnProps {
  /** Visual variant — drives color theming. */
  variant: ActionVariant;
  /** Current state — drives color intensity. */
  state?: ActionState;
  /** Icon (emoji or short symbol) shown left of the count. */
  icon: React.ReactNode;
  /** Count value rendered next to the icon. */
  count: number | string;
  /** Accessible label (and title fallback). */
  label: string;
  /** Tooltip on hover; defaults to `label`. */
  title?: string;
  /** Disabled state. */
  disabled?: boolean;
  /** When set, renders as <a> instead of <button>. */
  href?: string;
  /** Prefetch hint for the next/link router. */
  prefetch?: boolean;
  /** Click handler. Ignored if `href` is set. */
  onClick?: (e: React.MouseEvent) => void;
  /** Extra classes for layout tweaks (e.g. ml-auto). */
  className?: string;
}

/**
 * Unified action button used by both the inspiration card and the detail
 * view. Same shape, same color theming, same hover behavior across the two
 * surfaces — only the surrounding container width differs.
 *
 * Variants
 * ─────────
 * - `like`     rose tint, fills rose-500 when active
 * - `favorite` amber tint, fills amber-500 when active
 * - `share`    default = violet→orange gradient; success = emerald-500;
 *               error = rose-500
 * - `comment`  sky tint, hover only (no active state — it's a link)
 *
 * States
 * ──────
 * - `default`  white pill, slate-700 text, category-tinted hover
 * - `active`   category-filled pill, white text
 * - `success`  emerald-filled pill, white text (transient, e.g. "just copied")
 * - `error`    rose-filled pill, white text (transient, e.g. clipboard blocked)
 */
export const ActionPill = forwardRef<HTMLButtonElement | HTMLAnchorElement, ActionPillOwnProps>(
  function ActionPill(
    {
      variant,
      state = "default",
      icon,
      count,
      label,
      title,
      disabled,
      href,
      prefetch,
      onClick,
      className = "",
    },
    ref,
  ) {
    // ── Color theming per variant × state ──
    const theme = THEMES[variant];
    const palette =
      state === "active"
        ? theme.active
        : state === "success"
          ? (theme.success ?? theme.default)
          : state === "error"
            ? (theme.error ?? theme.default)
            : theme.default;

    // ── Shared base classes (same on card and detail page) ──
    const base =
      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";

    const cls = `${base} ${palette} ${className}`;

    const inner = (
      <>
        <span aria-hidden="true">{icon}</span>
        <span>{count}</span>
      </>
    );

    if (href) {
      // Navigation (e.g. comments anchor) — use next-intl Link to keep the
      // locale prefix consistent, fall back to plain <a> for hash links.
      const isExternal = href.startsWith("http") || href.startsWith("#");
      if (isExternal) {
        return (
          <a
            href={href}
            aria-label={label}
            title={title ?? label}
            className={cls}
            ref={ref as React.Ref<HTMLAnchorElement>}
          >
            {inner}
          </a>
        );
      }
      return (
        <Link
          href={href}
          aria-label={label}
          title={title ?? label}
          className={cls}
          prefetch={prefetch}
        >
          {inner}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        aria-label={label}
        title={title ?? label}
        disabled={disabled}
        onClick={onClick}
        className={cls}
      >
        {inner}
      </button>
    );
  },
);

interface ThemeSet {
  default: string;
  active?: string;
  success?: string;
  error?: string;
}

const THEMES: Record<ActionVariant, ThemeSet> = {
  like: {
    default:
      "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-rose-50 hover:text-rose-700",
    active: "bg-rose-500 text-white hover:bg-rose-600",
  },
  favorite: {
    default:
      "bg-white text-amber-700 ring-1 ring-amber-300 hover:bg-amber-50",
    active: "bg-amber-500 text-white hover:bg-amber-600",
  },
  share: {
    default:
      "bg-white text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    error: "bg-rose-500 text-white hover:bg-rose-600",
  },
  copy: {
    default:
      "bg-white text-violet-700 ring-1 ring-violet-200 hover:bg-violet-50",
    success: "bg-emerald-500 text-white hover:bg-emerald-600",
    error: "bg-rose-500 text-white hover:bg-rose-600",
  },
  comment: {
    default:
      "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-sky-50 hover:text-sky-700",
  },
};