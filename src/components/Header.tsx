"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/components/AuthProvider";
import { LoginButton, UserMenu } from "@/components/UserMenu";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const { user, requireAuth } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Public links — always reachable.
  const publicLinks = [
    { href: "/", label: t("home") },
    { href: "/explore", label: t("explore") },
    { href: "/generate", label: t("generate") },
  ] as const;

  // Auth-gated link — clicking while signed out opens the login dialog;
  // after a successful login the user lands on the destination.
  const myInspirationsHref = "/my-inspirations" as const;
  const myInspirationsLabel = t("myInspirations");

  function handleAuthGatedClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) {
    if (!user) {
      e.preventDefault();
      requireAuth(() => router.push(href));
    }
    setOpen(false);
  }

  // (open defaults to false on initial mount; no reset effect needed.)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-violet-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* Mobile: hamburger first (far left), then logo. Desktop: hidden. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-violet-100 text-slate-700 hover:bg-violet-50 md:hidden"
        >
          <span aria-hidden>{open ? "✕" : "☰"}</span>
        </button>

        <Link href="/" className="flex items-center gap-2 font-bold text-violet-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-orange-400 text-sm text-white">
            ✦
          </span>
          <span className="text-lg tracking-tight">DrawSpark</span>
        </Link>

        <nav className="ml-8 hidden items-center gap-6 md:flex">
          {publicLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-violet-600"
            >
              {link.label}
            </Link>
          ))}
          {/* Auth-gated: opens login dialog when not signed in */}
          <Link
            href={myInspirationsHref}
            onClick={(e) => handleAuthGatedClick(e, myInspirationsHref)}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-violet-600"
            data-auth-gated
          >
            {myInspirationsLabel}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <LocaleSwitcher />
          {user ? (
            <UserMenu user={user} onLoginRequest={() => requireAuth()} />
          ) : (
            <LoginButton onClick={() => requireAuth()} />
          )}
        </div>
      </div>

      {open && (
        <nav className="border-t border-violet-100 bg-white md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {publicLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={myInspirationsHref}
              onClick={(e) => handleAuthGatedClick(e, myInspirationsHref)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700"
              data-auth-gated
            >
              {myInspirationsLabel}
            </Link>
            <Link
              href="/generate"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-4 py-2 text-center text-sm font-semibold text-white shadow-md"
            >
              {t("generate")}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}