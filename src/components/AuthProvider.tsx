"use client";

import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthDialog } from "@/components/AuthDialog";
import type { AuthUser } from "@/lib/types";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  /** Open the login dialog. Optionally re-runs `then` after a successful login. */
  requireAuth: (then?: () => void | Promise<void>) => void;
};

const AuthContext = createContext<AuthState | null>(null);

/**
 * `useSearchParams()` opts the calling component out of static prerendering
 * (Next.js 16 requirement), so it MUST live behind a <Suspense> boundary.
 * We keep the rest of the provider — context, dialog, session refresh —
 * synchronous so the provider mounts cleanly on the server. The watcher
 * below is the only piece that needs the search params; the rest of the
 * provider works fine without it during SSR.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingAfterLogin, setPendingAfterLogin] = useState<
    (() => void | Promise<void>) | null
  >(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setUser(data.user ?? null);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session from cookie on mount. Without this, a hard navigation
  // (full page reload or auth-triggered remount) would leave `user` null
  // until the user explicitly logs in again, even though the JWT cookie
  // is still valid.
  useEffect(() => {
    // refresh() fetches /api/auth/me and updates local state (data-fetching effect)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  // Run pending callback once user transitions from null → logged-in.
  useEffect(() => {
    if (user && pendingAfterLogin) {
      const cb = pendingAfterLogin;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingAfterLogin(null);
      void cb();
    }
  }, [user, pendingAfterLogin]);

  const requireAuth = useCallback(
    (then?: () => void | Promise<void>) => {
      if (user) {
        if (then) void then();
        return;
      }
      setPendingAfterLogin(() => (then ? () => void then() : null));
      setDialogOpen(true);
    },
    [user],
  );

  const value = useMemo<AuthState>(
    () => ({ user, loading, refresh, logout, requireAuth }),
    [user, loading, refresh, logout, requireAuth],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <OAuthErrorWatcher
          onError={(code) => {
            setOauthError(code);
            setDialogOpen(true);
          }}
        />
      </Suspense>
      <AuthDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setPendingAfterLogin(null);
          setOauthError(null);
        }}
        onSuccess={() => {
          setDialogOpen(false);
          // The pending callback fires via the user-state effect.
        }}
        initialError={oauthError}
      />
    </AuthContext.Provider>
  );
}

/**
 * Reads `?oauth_error=<code>` from the URL (set by the Google OAuth callback
 * when something goes wrong) and surfaces it to the auth dialog. This is
 * wrapped in <Suspense> by the parent so Next.js can statically prerender
 * the rest of the page; this child is fully client-side and falls back to
 * `null` until the URL has been read.
 */
function OAuthErrorWatcher({
  onError,
}: {
  onError: (code: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("oauth_error");
    if (!err) return;
    onError(err);
    const url = new URL(window.location.href);
    url.searchParams.delete("oauth_error");
    router.replace(url.pathname + url.search);
    // onError / router are stable enough for our purposes; re-running on
    // searchParams change is the intended trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}