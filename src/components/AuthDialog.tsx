"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Mode = "login" | "register";

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  /**
   * Called after a successful login/register so the trigger that opened the
   * dialog can re-run its action (e.g. favorite, comment).
   */
  onSuccess?: () => void;
  /**
   * Pre-set error to show when the dialog opens. Used by the OAuth callback
   * to surface `?oauth_error=<code>` from the URL.
   */
  initialError?: string | null;
}

export function AuthDialog({
  open,
  onClose,
  initialMode = "login",
  onSuccess,
  initialError,
}: AuthDialogProps) {
  const t = useTranslations("auth");
  const { refresh } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [captchaCode, setCaptchaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const refreshCaptchaRef = useRef<() => Promise<void>>(async () => {});

  // Lock body scroll + reset state when opened
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMode(initialMode);
    setError(initialError ? mapOauthError(initialError) : null);
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialMode]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Load captcha on open or mode change
  const loadCaptcha = async () => {
    try {
      const res = await fetch("/api/auth/captcha", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCaptchaId(data.captchaId);
        setCaptchaSvg(data.svg);
        setCaptchaCode("");
        setError(null);
      } else {
        setError(t("captchaLoadFailed"));
      }
    } catch {
      setError(t("captchaLoadFailed"));
    }
  };
  refreshCaptchaRef.current = loadCaptcha;

  useEffect(() => {
    if (open) loadCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password || !captchaCode) {
      setError(t("fieldsRequired"));
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setError(t("displayNameRequired"));
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = {
        email,
        password,
        captchaId,
        captchaCode,
      };
      if (mode === "register") body.displayName = displayName.trim();

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        const errKey = mapErrorKey(data.error, mode);
        setError(t(errKey));
        await refreshCaptchaRef.current();
        return;
      }
      await refresh();
      onSuccess?.();
      onClose();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  function mapErrorKey(code: string | undefined, m: Mode): string {
    switch (code) {
      case "CAPTCHA_INVALID":
        return "captchaWrong";
      case "INVALID_CREDENTIALS":
        return "invalidCredentials";
      case "EMAIL_TAKEN":
        return "emailTaken";
      case "EMAIL_INVALID":
        return "emailInvalid";
      case "PASSWORD_TOO_SHORT":
        return "passwordTooShort";
      case "DISPLAY_NAME_INVALID":
        return "displayNameInvalid";
      default:
        return m === "login" ? "loginFailed" : "registerFailed";
    }
  }

  /**
   * Map a raw OAuth error code (returned from Supabase via `?oauth_error=`)
   * to a localised, user-readable string.
   */
  function mapOauthError(code: string): string {
    switch (code) {
      case "bad_oauth_state":
        return t("oauthBadState");
      case "access_denied":
        return t("oauthAccessDenied");
      case "exchange_failed":
      case "missing_code":
      case "no_email":
      case "internal":
      case "unknown":
        return t("oauthExchangeFailed");
      default:
        return t("googleFailed");
    }
  }

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
  };

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      // Save the path we're on so the OAuth callback can return us here
      // after Google finishes. Only same-origin absolute paths are allowed
      // server-side, so we don't have to worry about open-redirect abuse.
      const here =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      await fetch("/api/auth/google/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: here }),
      }).catch(() => {
        // Non-fatal: if the cookie write fails the callback falls back to "/".
      });

      const callbackUrl = `${window.location.origin}/api/auth/google/callback`;
      const { error: oauthError } = await getBrowserSupabase().auth.signInWithOAuth(
        {
          provider: "google",
          options: { redirectTo: callbackUrl },
        },
      );
      if (oauthError) {
        setError(t("googleFailed"));
        setGoogleLoading(false);
      }
      // On success the browser navigates away — leave googleLoading=true.
    } catch {
      setError(t("googleFailed"));
      setGoogleLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        // Outer shell — flexible width:
        //   mobile:  full-width card, image as a compact top banner
        //   desktop: wider card with image on the left, form on the right
        className="relative grid w-full max-w-sm grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-3xl sm:grid-cols-[5fr_7fr] sm:items-stretch"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-slate-900"
        >
          ✕
        </button>

        {/* ---- Left / top: hero image ----
            Mobile (<640px): wide 4-panel banner (mobile-optimized JPG).
            Desktop (≥640px): tall portrait illustration.
            <picture> lets the browser pick the correct source and avoids
            loading both — desktop never downloads the mobile file and
            vice versa. */}
        <div className="relative h-40 w-full overflow-hidden sm:h-auto sm:min-h-[480px]">
          <picture>
            <source
              media="(min-width: 640px)"
              srcSet="/auth/login-hero.jpg"
            />
            <Image
              src="/auth/login-hero-mobile.jpg"
              alt="Hand-drawn sketch illustrations — dog, surfer, horses, rocket"
              fill
              sizes="(max-width: 639px) 100vw, 0px"
              priority
              className="object-cover"
            />
          </picture>
        </div>

        {/* ---- Right / bottom: form panel ---- */}
        <div className="flex max-h-[80vh] flex-col overflow-hidden sm:max-h-[min(85vh,560px)]">
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {mode === "login" ? t("loginTitle") : t("registerTitle")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "login" ? t("loginSubtitle") : t("registerSubtitle")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* ---- Google one-tap ---- */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="group flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
              >
                <GoogleGLogo className="h-[18px] w-[18px] shrink-0" />
                <span>{googleLoading ? "..." : t("googleSignIn")}</span>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs uppercase tracking-wider text-slate-400">
                    {t("orContinueWith")}
                  </span>
                </div>
              </div>

              {mode === "register" && (
                <Field
                  label={t("displayName")}
                  value={displayName}
                  onChange={setDisplayName}
                  maxLength={30}
                  autoComplete="nickname"
                  required
                />
              )}
              <Field
                label={t("email")}
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
              <Field
                label={t("password")}
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                required
              />

              <div className="flex items-start gap-2">
                <input
                  type="text"
                  value={captchaCode}
                  onChange={(e) => setCaptchaCode(e.target.value)}
                  placeholder={t("captchaPlaceholder")}
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase tracking-widest focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
                />
                <button
                  type="button"
                  onClick={() => refreshCaptchaRef.current()}
                  aria-label={t("refreshCaptcha")}
                  className="flex h-12 w-28 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:border-violet-300"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:shadow-md disabled:opacity-60"
              >
                {loading
                  ? "..."
                  : mode === "login"
                    ? t("loginButton")
                    : t("registerButton")}
              </button>

              <div className="text-center text-xs text-slate-500">
                {mode === "login" ? (
                  <>
                    {t("noAccount")}{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="font-semibold text-violet-600 hover:text-violet-800"
                    >
                      {t("registerNow")}
                    </button>
                  </>
                ) : (
                  <>
                    {t("haveAccount")}{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="font-semibold text-violet-600 hover:text-violet-800"
                    >
                      {t("loginNow")}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200"
        {...rest}
      />
    </label>
  );
}

/**
 * Inline multi-color "G" logo. Matches Google's brand guidelines — the four
 * panel colors and the blue G outline. Inlined so we don't need an asset
 * file or external network call.
 */
function GoogleGLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}