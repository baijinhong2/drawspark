"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ActionPill } from "@/components/ActionPill";
import { EmojiPicker } from "@/components/EmojiPicker";
import { ShareTip } from "@/components/ShareTip";
import {
  IconLike,
  IconFavorite,
  IconShare,
  IconComment,
  IconCopy,
  IconCheck,
  IconRetry,
  IconImagePlus,
} from "@/components/icons";
import { useAuth } from "@/components/AuthProvider";
import { useInspirationActions } from "@/lib/useInspirationActions";
import { inspirationSlug } from "@/lib/slug";
import { formatCount } from "@/lib/format";
import type { InspirationResponse } from "@/lib/types";
import type { SerializedComment } from "@/lib/comments";

interface InspirationViewProps {
  inspiration: InspirationResponse;
  initialFavorited: boolean;
  initialComments: SerializedComment[];
  similarHref: { id: string; title: string }[];
}

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  easy: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700",
};

export function InspirationView({
  inspiration,
  initialFavorited,
  initialComments,
}: InspirationViewProps) {
  const t = useTranslations("card");
  const tComments = useTranslations("comments");
  const tEnum = useTranslations("enums");
  const { user, requireAuth } = useAuth();

  // Build the absolute share URL on the client.
  const detailHref = `/i/${inspiration.id}/${inspirationSlug(
    inspiration.title,
  )}`;
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);
  const shareUrl = origin ? `${origin}${detailHref}` : detailHref;

  // ── Optimistic counts + handlers ──
  const {
    likes,
    copies,
    shares,
    favorites,
    liked,
    favorited,
    copyState,
    shareState,
    loading,
    errorMessage: actionError,
    setErrorMessage: setActionError,
    handleLike,
    handleFavorite,
    handleQuickCopy,
    handleShare,
  } = useInspirationActions({
    inspirationId: inspiration.id,
    initialLikesCount: inspiration.likes_count,
    initialCopiesCount: inspiration.copies_count,
    initialSharesCount: inspiration.shares_count,
    initialFavoritesCount: inspiration.favorites_count,
    initialFavorited,
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

  // ── Comments state ──
  const [comments, setComments] =
    useState<SerializedComment[]>(initialComments);
  const [commentsCount, setCommentsCount] = useState(
    inspiration.comments_count,
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SerializedComment | null>(null);
  const [commentImage, setCommentImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combined error: either from actions (like/favorite/copy/share) or comments.
  const errorMessage = actionError ?? commentError;
  const setErrorMessage = (msg: string | null) => {
    setActionError(msg);
    setCommentError(msg);
  };

  function insertEmoji(emoji: string) {
    const el = draftRef.current;
    if (!el) {
      setCommentDraft((d) => d + emoji);
      return;
    }
    const start = el.selectionStart ?? commentDraft.length;
    const end = el.selectionEnd ?? commentDraft.length;
    const next = commentDraft.slice(0, start) + emoji + commentDraft.slice(end);
    setCommentDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + emoji.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!user) {
      requireAuth();
      return;
    }
    setUploadingImage(true);
    setCommentError(null);
    try {
      const { compressImage } = await import("@/lib/compress");
      const compressed = await compressImage(file, "comments");
      const form = new FormData();
      form.append("file", compressed);
      form.append("type", "comments");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!data.success) {
        setCommentError(data.message || data.error || "Upload failed");
        return;
      }
      setCommentImage(data.url);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  function handleCommentFocus() {
    if (!user) requireAuth();
  }

  async function handleSubmitComment() {
    if (!user) {
      handleCommentFocus();
      return;
    }
    const text = commentDraft.trim();
    if (!text && !commentImage) return;
    setSubmitting(true);
    setCommentError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspirationId: inspiration.id,
          parentId: replyingTo ? replyingTo.id : null,
          content: text,
          imageUrl: commentImage,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const created: SerializedComment = {
          ...data.comment,
          replies: [],
        };
        setComments((prev) => insertComment(prev, created));
        setCommentsCount((c) => c + 1);
        setCommentDraft("");
        setCommentImage(null);
        setReplyingTo(null);
      } else if (data.error === "UNAUTHORIZED") {
        requireAuth();
      } else {
        setCommentError(data.message || data.error || "Comment failed");
      }
    } catch {
      setCommentError("Network error. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyClick() {
    const ok = await handleQuickCopy();
    if (!ok) {
      setErrorMessage("Clipboard blocked. Please copy manually.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-12 sm:px-6 sm:pt-6">
      {/* Header card — meta badges → title → description → (tags + copy) */}
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-500 to-orange-400 text-white shadow-sm">
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          {/* Meta badges — fixed order: time, difficulty, subject, style, audience, mood, scene */}
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              ⏱ {tEnum(`time.${inspiration.time_estimate}`)}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur ${
                difficultyColors[inspiration.difficulty] ?? "bg-white/20"
              }`}
            >
              {tEnum(`difficulty.${inspiration.difficulty}`)}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              {inspiration.subject.map((s) => tEnum(`subject.${s}`)).join(", ")}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              {inspiration.style.map((s) => tEnum(`style.${s}`)).join(", ")}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              👥 {inspiration.audience.map((a) => tEnum(`audience.${a}`)).join(", ")}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              {inspiration.mood.map((m) => tEnum(`mood.${m}`)).join(", ")}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
              {inspiration.scene.map((s) => tEnum(`scene.${s}`)).join(", ")}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            {inspiration.title}
          </h1>

          {inspiration.description && (
            <p className="mt-4 text-base leading-relaxed text-white/90 sm:text-lg">
              {inspiration.description}
            </p>
          )}

          {/* Tags + Copy button — bottom row inside the description card */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap gap-2">
              {inspiration.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/20 px-2.5 py-1 text-xs text-white backdrop-blur"
                >
                  #{tag}
                </span>
              ))}
            </div>
            {/* Copy button — same ActionPill component as card action bar */}
            <ActionPill
              variant="copy"
              state={copyState}
              icon={
                copyState === "success" ? (
                  <IconCheck className="size-4" />
                ) : copyState === "error" ? (
                  <IconRetry className="size-4" />
                ) : (
                  <IconCopy className="size-4" />
                )
              }
              count={formatCount(copies)}
              label={copyState === "success" ? t("copiedAll") : t("copyAll")}
              onClick={() => void handleCopyClick()}
              className="shrink-0"
            />
          </div>
        </div>
      </header>

      {/* Action bar — like / favorite / share / comment, each with count */}
      <section className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <ActionPill
            variant="like"
            state={liked ? "active" : "default"}
            icon={<IconLike filled={liked} className="size-4" />}
            count={formatCount(likes)}
            label={liked ? t("liked") : t("like")}
            disabled={liked || loading === "like"}
            onClick={() => void handleLike()}
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
            onClick={handleFavorite}
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
            onClick={() => void handleShare()}
          />
          <ActionPill
            variant="comment"
            icon={<IconComment className="size-4" />}
            count={formatCount(commentsCount)}
            label={tComments("title")}
            href="#comments"
          />
        </div>
      </section>

      {/* Comments */}
      <section
        id="comments"
        className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">
            {tComments("title")}
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {formatCount(commentsCount)}
          </span>
        </div>

        <div className="mb-4">
          <ShareTip />
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between rounded-md bg-violet-50 px-3 py-1.5 text-xs text-violet-700">
              <span>
                {tComments("replyingTo", {
                  name: replyingTo.user.displayName,
                })}
              </span>
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(null);
                  setCommentDraft("");
                }}
                className="text-violet-500 hover:text-violet-700"
              >
                ✕
              </button>
            </div>
          )}
          <textarea
            ref={draftRef}
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            onFocus={handleCommentFocus}
            placeholder={
              user ? tComments("placeholder") : tComments("loginToComment")
            }
            rows={3}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
          />
          {commentImage && (
            <div className="relative mt-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={commentImage}
                alt=""
                className="max-h-32 rounded-lg border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={() => setCommentImage(null)}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 hover:text-rose-600"
              >
                ✕
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePickImage}
            className="hidden"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <EmojiPicker
                onPick={(emoji) => {
                  if (!user) {
                    requireAuth();
                    return;
                  }
                  insertEmoji(emoji);
                }}
                disabled={!user}
              />
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    requireAuth();
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={uploadingImage}
                aria-label="Attach image"
                className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-violet-700 disabled:opacity-50"
              >
                {uploadingImage ? (
                  <span
                    aria-hidden
                    className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-violet-700"
                  />
                ) : (
                  <IconImagePlus className="size-5" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={
                submitting || (!commentDraft.trim() && !commentImage)
              }
              className="rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-5 py-1.5 text-sm font-bold text-white shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {submitting ? "..." : tComments("submit")}
            </button>
          </div>
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-slate-400">{tComments("empty")}</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <CommentNode
                key={c.id}
                comment={c}
                onReply={(c) => {
                  setReplyingTo(c);
                  setCommentDraft(`@${c.user.displayName} `);
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CommentNode({
  comment,
  onReply,
  depth = 0,
}: {
  comment: SerializedComment;
  onReply: (c: SerializedComment) => void;
  depth?: number;
}) {
  const tComments = useTranslations("comments");
  return (
    <li
      className={
        "rounded-xl border border-slate-100 bg-white p-3 text-sm " +
        (depth > 0 ? "ml-6 border-slate-100 bg-slate-50" : "")
      }
    >
      <div className="mb-1 flex items-center gap-2">
        {comment.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.user.avatarUrl}
            alt=""
            className="h-6 w-6 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-orange-400 text-[10px] font-bold text-white">
            {comment.user.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="font-semibold text-slate-800">
          {comment.user.displayName}
        </span>
        <span className="text-xs text-slate-400">
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-slate-700">{comment.content}</p>
      {comment.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={comment.imageUrl}
          alt=""
          className="mt-2 max-h-48 rounded-lg object-cover"
        />
      )}
      {depth === 0 && (
        <button
          type="button"
          onClick={() => onReply(comment)}
          className="mt-2 text-xs font-semibold text-violet-600 hover:text-violet-800"
        >
          {tComments("reply")}
        </button>
      )}
      {comment.replies.length > 0 && (
        <ul className="mt-3 space-y-2">
          {comment.replies.map((r) => (
            <CommentNode
              key={r.id}
              comment={r}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function insertComment(
  tree: SerializedComment[],
  comment: SerializedComment,
): SerializedComment[] {
  if (!comment.parentId) return [...tree, comment];
  return tree.map((node) => {
    if (node.id === comment.parentId) {
      return { ...node, replies: [...node.replies, comment] };
    }
    return { ...node, replies: insertComment(node.replies, comment) };
  });
}