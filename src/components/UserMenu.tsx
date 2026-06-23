"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { IconUser, IconLogout } from "@/components/icons";
import type { AuthUser } from "@/lib/types";

interface UserMenuProps {
  user: AuthUser;
  /** Notifies the parent that the auth dialog should be opened. */
  onLoginRequest: () => void;
}

export function UserMenu({ user }: UserMenuProps) {
  const t = useTranslations("user");
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleLogout() {
    await logout();
    setOpen(false);
  }

  const initials = user.displayName.trim().slice(0, 1).toUpperCase() || "U";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("accountMenu")}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-violet-100 bg-white p-1 transition hover:border-violet-300"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-orange-400 text-sm font-bold text-white">
            {initials}
          </span>
        )}
        <span className="hidden pr-2 text-sm font-medium text-slate-700 sm:inline">
          {user.displayName}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              {user.displayName}
            </div>
            <div className="truncate text-xs text-slate-500">{user.email}</div>
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700"
          >
            <IconUser className="size-4 shrink-0" />
            <span>{t("profile")}</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 hover:bg-rose-50 hover:text-rose-600"
          >
            <IconLogout className="size-4 shrink-0" />
            <span>{t("logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function LoginButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("user");
  return (
    <button
      type="button"
      onClick={onClick}
      className="whitespace-nowrap rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:border-violet-400 hover:bg-violet-50"
    >
      {t("login")}
    </button>
  );
}