"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { IconCamera, IconLogout, IconPencil } from "@/components/icons";

export function ProfileClient() {
  const t = useTranslations("profile");
  const { user, loading, refresh, logout } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="h-32 animate-pulse rounded-2xl bg-violet-50" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">{t("loginRequired")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
      </header>

      <div className="relative rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <AvatarUpload
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            onUpdated={() => refresh()}
          />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <DisplayNameEditor />
            <p className="mt-1 break-all text-sm text-slate-500">
              {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          aria-label={t("logout")}
          title={t("logout")}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
        >
          <IconLogout className="size-4" />
        </button>
      </div>
    </div>
  );
}

function AvatarUpload({
  avatarUrl,
  displayName,
  onUpdated,
}: {
  avatarUrl: string | null;
  displayName: string;
  onUpdated: () => void;
}) {
  const t = useTranslations("profile");
  const { refresh } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { compressImage } = await import("@/lib/compress");
      const compressed = await compressImage(file, "avatars");
      const form = new FormData();
      form.append("file", compressed);
      form.append("type", "avatars");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || data.error || "Upload failed");
        return;
      }
      const url: string = data.url;
      const upd = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: url }),
      });
      const updData = await upd.json();
      if (!updData.success) {
        setError(updData.message || updData.error || "Update failed");
        return;
      }
      await refresh();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const initials = displayName.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        className={
          "group relative inline-block h-20 w-20 cursor-pointer overflow-hidden rounded-full ring-2 ring-violet-100 transition hover:ring-violet-300 " +
          (uploading ? "opacity-60" : "")
        }
        title={t("uploadAvatar")}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-orange-400 text-2xl font-bold text-white">
            {initials}
          </span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <span
              aria-hidden
              className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
            />
          ) : (
            <IconCamera className="size-5" />
          )}
        </span>
        {/*
          File input must live INSIDE the label so that clicking anywhere on
          the avatar/overlay triggers the file picker. (HTML <label> only
          forwards clicks to inputs that are descendants or referenced via
          `for`/`id`; previously the input was a sibling and clicking did
          nothing.)
        */}
        <input
          type="file"
          accept="image/*"
          onChange={handlePick}
          disabled={uploading}
          className="sr-only"
        />
      </label>
      {error && (
        <p className="max-w-[8rem] text-center text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function DisplayNameEditor() {
  const t = useTranslations("profile");
  const { user, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  // Sync external changes (e.g. after refresh()) into local state, but only
  // while the user isn't actively editing — recomputed during render so we
  // don't need a syncing effect.
  if (!editing && value !== user.displayName) {
    setValue(user.displayName);
  }

  async function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === user?.displayName) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: trimmed }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || data.error || "Update failed");
        return;
      }
      await refresh();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={t("editName")}
        title={t("editName")}
        className="group inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xl font-bold text-slate-900 transition hover:bg-violet-50 sm:text-2xl"
      >
        <span className="truncate">{user.displayName}</span>
        <IconPencil className="size-3.5 shrink-0 text-slate-400 transition group-hover:text-violet-700" />
      </button>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={30}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") {
              setEditing(false);
              setValue(user?.displayName ?? "");
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 sm:text-base"
        />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving ? "..." : t("save")}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setValue(user?.displayName ?? "");
            }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}