"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ActionPill } from "@/components/ActionPill";
import {
  IconLike,
  IconFavorite,
  IconShare,
  IconComment,
  IconCheck,
  IconRetry,
} from "@/components/icons";
import { useInspirationActions } from "@/lib/useInspirationActions";
import { truncateDescription } from "@/lib/inspiration";
import { inspirationSlug } from "@/lib/slug";
import { formatCount } from "@/lib/format";
import type { InspirationResponse } from "@/lib/types";

interface InspirationCardProps {
  inspiration: InspirationResponse;
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700",
};

export function InspirationCard({ inspiration }: InspirationCardProps) {
  const t = useTranslations("card");
  const tEnum = useTranslations("enums");
  const { user } = useAuth();

  // Build the absolute share URL on the client (window.location.origin),
  // so cards don't need to know the deployment hostname at SSR time.
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const detailHref = `/i/${inspiration.id}/${inspirationSlug(inspiration.title)}`;
  const shareUrl = origin ? `${origin}${detailHref}` : detailHref;

  const {
    likes,
    shares,
    favorites,
    liked,
    favorited,
    shareState,
    loading,
    errorMessage,
    handleLike,
    handleFavorite,
    handleShare,
  } = useInspirationActions({
    inspirationId: inspiration.id,
    initialLikesCount: inspiration.likes_count,
    initialCopiesCount: inspiration.copies_count,
    initialSharesCount: inspiration.shares_count,
    initialFavoritesCount: inspiration.favorites_count,
    initialFavorited: inspiration.favorited,
    title: inspiration.title,
    description: inspiration.description,
    shareUrl,
    messages: {
      likeFailed: t("retry"),
      favoriteFailed: t("favoriteFailed"),
      shareCopied: t("shareCopied"),
      shareFailed: t("shareFailed"),
    },
  });

  const [comments] = useState(inspiration.comments_count);

  const description = inspiration.description
    ? truncateDescription(inspiration.description)
    : "";

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
      <Link
        href={detailHref}
        prefetch={false}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
            {tEnum(`subject.${inspiration.subject}`)} ·{" "}
            {tEnum(`style.${inspiration.style}`)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              difficultyColors[inspiration.difficulty] ??
              "bg-slate-100 text-slate-600"
            }`}
          >
            {tEnum(`difficulty.${inspiration.difficulty}`)}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            ⏱ {tEnum(`time.${inspiration.time_estimate}`)}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            👥 {tEnum(`audience.${inspiration.audience}`)}
          </span>
        </div>

        <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-violet-700">
          {inspiration.title}
        </h3>

        {description && (
          <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        )}

        {inspiration.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {inspiration.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-orange-50 px-2 py-0.5 text-xs text-orange-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>

      {errorMessage && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700"
        >
          {errorMessage}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <ActionPill
          variant="like"
          state={liked ? "active" : "default"}
          icon={<IconLike filled={liked} className="size-4" />}
          count={formatCount(likes)}
          label={liked ? t("liked") : t("like")}
          disabled={liked || loading === "like"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleLike();
          }}
        />
        <ActionPill
          variant="favorite"
          state={favorited ? "active" : "default"}
          icon={<IconFavorite filled={favorited} className="size-4" />}
          count={formatCount(favorites)}
          label={favorited ? t("favorited") : t("favorite")}
          title={
            user
              ? favorited
                ? t("favorited")
                : t("favorite")
              : t("loginToFavorite")
          }
          disabled={loading === "favorite"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFavorite();
          }}
        />
        <ActionPill
          variant="share"
          state={shareState}
          icon={
            shareState === "success" ? (
              <IconCheck className="size-4" />
            ) : shareState === "error" ? (
              <IconRetry className="size-4" />
            ) : (
              <IconShare className="size-4" />
            )
          }
          count={formatCount(shares)}
          label={shareState === "success" ? t("shareCopied") : t("share")}
          disabled={shareState === "success"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleShare();
          }}
        />
        <ActionPill
          variant="comment"
          icon={<IconComment className="size-4" />}
          count={formatCount(comments)}
          label={t("comments")}
          href={`${detailHref}#comments`}
        />
        <Link
          href={detailHref}
          prefetch={false}
          className="ml-auto text-xs font-semibold text-violet-600 opacity-0 transition group-hover:opacity-100"
        >
          {t("view")} →
        </Link>
      </div>
    </article>
  );
}