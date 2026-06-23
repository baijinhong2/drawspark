"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";

/**
 * Optimistic state machine for inspiration interactions (like / favorite /
 * share / quick-copy) used by the gallery card and the detail view.
 *
 * Key invariants
 * ──────────────
 * 1. **No optimistic update before auth.** When a write needs auth (favorite),
 *    the optimistic toggle runs inside `requireAuth`'s callback so cancelling
 *    the login dialog leaves the UI in its original state.
 * 2. **Server is the source of truth.** On every success response we sync
 *    both the toggle flag and the count to whatever the API returned
 *    (deduped, race-correct, etc.).
 * 3. **409/404 are not errors.** ALREADY_LIKED / ALREADY_FAVORITED /
 *    NOT_FAVORITED mean the server's view of "this user's state" disagrees
 *    with ours optimistically. We sync the local flag to the server's truth
 *    and keep the optimistic count (which already matches the deduped
 *    server count).
 * 4. **Any other failure reverts via snapshot.** Pre-click values are snapshotted
 *    so the revert doesn't depend on stale closure values or SSR props.
 * 5. **Like and share are anonymous (cookie session).** No `requireAuth`
 *    needed — anyone can like or share.
 */
export function useInspirationActions(input: {
  inspirationId: string;
  initialLikesCount: number;
  initialCopiesCount: number;
  initialSharesCount: number;
  initialFavoritesCount: number;
  initialFavorited: boolean;
  /** Inspiration title — used to build copy text. */
  title: string;
  /** Inspiration description — used to build copy text. */
  description: string | null;
  /** Absolute URL to share (full origin + path). */
  shareUrl: string;
  /** Localized fallback strings (passed in so callers can i18n). */
  messages: {
    likeFailed: string;
    favoriteFailed: string;
    shareCopied: string;
    shareFailed: string;
  };
}) {
  const { requireAuth } = useAuth();

  const [likes, setLikes] = useState(input.initialLikesCount);
  const [copies, setCopies] = useState(input.initialCopiesCount);
  const [shares, setShares] = useState(input.initialSharesCount);
  const [favorites, setFavorites] = useState(input.initialFavoritesCount);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(input.initialFavorited);
  const [copyState, setCopyState] = useState<
    "default" | "success" | "error"
  >("default");
  const [shareState, setShareState] = useState<
    "default" | "success" | "error"
  >("default");
  const [loading, setLoading] = useState<"like" | "favorite" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Snapshot refs so failure paths revert to pre-click values, not stale
  // closures from an earlier render.
  const favSnapRef = useRef<{ favorited: boolean; favorites: number } | null>(
    null,
  );
  const likeSnapRef = useRef<{ likes: number } | null>(null);

  const handleLike = useCallback(async () => {
    if (liked || loading) return;
    setLoading("like");
    setErrorMessage(null);

    const prevLikes = likes;
    likeSnapRef.current = { likes };

    // Optimistic — instant feedback.
    setLiked(true);
    setLikes((c) => c + 1);

    try {
      const res = await fetch(`/api/inspirations/${input.inspirationId}/like`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        likes_count?: number;
        error?: string;
        message?: string;
      };
      if (data.success && typeof data.likes_count === "number") {
        setLikes(data.likes_count);
        setLiked(true);
      } else if (data.error === "ALREADY_LIKED") {
        // Server already counted this like. Sync flag; count already correct.
        setLiked(true);
      } else {
        setLiked(false);
        setLikes(prevLikes);
        setErrorMessage(data.message || input.messages.likeFailed);
      }
    } catch (err) {
      setLiked(false);
      setLikes(prevLikes);
      setErrorMessage(
        err instanceof Error ? err.message : "Network error. Please retry.",
      );
    } finally {
      setLoading(null);
    }
  }, [liked, loading, likes, input.inspirationId, input.messages.likeFailed]);

  const handleFavorite = useCallback(() => {
    if (loading) return;
    setLoading("favorite");
    setErrorMessage(null);

    const prevFavorited = favorited;
    const prevFavorites = favorites;
    favSnapRef.current = { favorited, favorites };

    const run = async () => {
      // Optimistic AFTER auth is confirmed so cancelling the login dialog
      // leaves the UI in its original state.
      setFavorited(!prevFavorited);
      setFavorites((c) => c + (prevFavorited ? -1 : 1));

      try {
        const url = `/api/favorites?inspirationId=${encodeURIComponent(
          input.inspirationId,
        )}`;
        const res = await fetch(url, {
          method: prevFavorited ? "DELETE" : "POST",
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          favorited?: boolean;
          favoritesCount?: number;
          error?: string;
          message?: string;
        };

        if (data.success) {
          setFavorited(!!data.favorited);
          if (typeof data.favoritesCount === "number") {
            setFavorites(data.favoritesCount);
          }
        } else if (data.error === "ALREADY_FAVORITED") {
          // Server already had us favorited. Sync flag; keep optimistic count.
          setFavorited(true);
        } else if (data.error === "NOT_FAVORITED") {
          setFavorited(false);
        } else if (data.error === "UNAUTHORIZED") {
          setFavorited(prevFavorited);
          setFavorites(prevFavorites);
          setErrorMessage(input.messages.favoriteFailed);
        } else {
          setFavorited(prevFavorited);
          setFavorites(prevFavorites);
          setErrorMessage(data.message || input.messages.favoriteFailed);
        }
      } catch (err) {
        setFavorited(prevFavorited);
        setFavorites(prevFavorites);
        setErrorMessage(
          err instanceof Error ? err.message : "Network error. Please retry.",
        );
      } finally {
        setLoading(null);
      }
    };

    requireAuth(run);
  }, [
    loading,
    favorited,
    favorites,
    input.inspirationId,
    input.messages.favoriteFailed,
    requireAuth,
  ]);

  async function handleQuickCopy(): Promise<boolean> {
    const text = `${input.title ?? ""}\n\n${input.description ?? ""}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (!legacyCopy(text)) {
        setCopyState("error");
        return false;
      }
    }

    setCopies((c) => c + 1);
    setCopyState("success");

    fetch(`/api/inspirations/${input.inspirationId}/copy`, { method: "POST" })
      .then((r) => r.json())
      .then((data: { success?: boolean; copies_count?: number }) => {
        if (data?.success && typeof data.copies_count === "number") {
          setCopies(data.copies_count);
        }
      })
      .catch(() => {
        // Swallow — clipboard already wrote.
      });

    setTimeout(() => setCopyState("default"), 2000);
    return true;
  }

  /**
   * Share = copy the inspiration's detail URL to clipboard + bump the
   * server-side shares_count. Public — anyone can share.
   *
   * The URL must be absolute (or at least include origin) for clipboard
   * links to work in messengers. Callers pass it via `input.shareUrl`.
   */
  async function handleShare(): Promise<boolean> {
    setErrorMessage(null);
    try {
      await navigator.clipboard.writeText(input.shareUrl);
    } catch {
      if (!legacyCopy(input.shareUrl)) {
        setShareState("error");
        setErrorMessage(input.messages.shareFailed);
        return false;
      }
    }
    // Optimistic +1 — share doesn't dedup so optimistic always wins until
    // server confirms.
    setShares((c) => c + 1);
    setShareState("success");
    setTimeout(() => setShareState("default"), 2000);

    fetch(`/api/inspirations/${input.inspirationId}/share`, { method: "POST" })
      .then((r) => r.json())
      .then((data: { success?: boolean; shares_count?: number }) => {
        if (data?.success && typeof data.shares_count === "number") {
          setShares(data.shares_count);
        }
      })
      .catch(() => {
        // Swallow — clipboard already wrote. Count may be slightly stale.
      });

    return true;
  }

  return {
    // state
    likes,
    copies,
    shares,
    favorites,
    liked,
    favorited,
    copyState,
    shareState,
    loading,
    errorMessage,
    setErrorMessage,
    // actions
    handleLike,
    handleFavorite,
    handleQuickCopy,
    handleShare,
  };
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}