"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { InspirationCard } from "@/components/InspirationCard";
import { useAuth } from "@/components/AuthProvider";
import type { InspirationResponse } from "@/lib/types";

type Tab = "inspirations" | "favorites";

export function MyInspirationsClient() {
  const t = useTranslations("myInspirations");
  const tUser = useTranslations("user");
  const { user, loading, requireAuth } = useAuth();

  const [tab, setTab] = useState<Tab>("inspirations");
  const [items, setItems] = useState<InspirationResponse[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function loadItems(which: Tab) {
    if (!user) return;
    setLoadingItems(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/users/me/${which}`);
      const data = await res.json();
      if (!data.success) {
        setErrorMessage(data.message || data.error || "Failed to load");
        setItems([]);
        return;
      }
      const list =
        which === "inspirations"
          ? (data.data.inspirations as InspirationResponse[])
          : (data.data.favorites as { inspiration: InspirationResponse }[]).map(
              (f) => f.inspiration,
            );
      setItems(list);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error. Please retry.",
      );
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  useEffect(() => {
    if (user) {
      // loadItems itself updates local state (data-fetching effect)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadItems(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab]);

  // Loading skeleton while auth state is being resolved.
  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="h-32 animate-pulse rounded-2xl bg-violet-50" />
      </div>
    );
  }

  // Not signed in — show a clear sign-in CTA. (Header already intercepts, but
  // direct visits should also land on a meaningful screen, not a blank page.)
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-violet-100 bg-white p-8 text-center shadow-sm">
          <div className="mb-3 text-3xl">✨</div>
          <p className="mb-5 text-sm text-slate-600">{t("loginRequired")}</p>
          <button
            type="button"
            onClick={() => requireAuth()}
            className="rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
          >
            {tUser("login")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
      </header>

      <div className="flex gap-2 border-b border-slate-200">
        <TabButton
          active={tab === "inspirations"}
          onClick={() => setTab("inspirations")}
          icon="✨"
          label={tUser("myInspirations")}
        />
        <TabButton
          active={tab === "favorites"}
          onClick={() => setTab("favorites")}
          icon="★"
          label={tUser("myFavorites")}
        />
      </div>

      <div className="mt-6">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}
        {loadingItems ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-violet-50"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {tab === "inspirations" ? t("emptyInspirations") : t("emptyFavorites")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <InspirationCard key={item.id} inspiration={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "relative -mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition " +
        (active
          ? "border-violet-600 text-violet-700"
          : "border-transparent text-slate-500 hover:text-slate-700")
      }
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}