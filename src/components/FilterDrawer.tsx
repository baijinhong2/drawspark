"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AUDIENCES,
  DIFFICULTIES,
  MOODS,
  SCENES,
  STYLES,
  SUBJECTS,
  TIME_ESTIMATES,
} from "@/lib/constants";
import {
  EMPTY_FILTERS,
  FILTER_LABELS,
  type FilterKey,
  type MultiFilters,
} from "@/lib/quickTags";

interface FilterDrawerProps {
  open: boolean;
  /** The filter values currently applied to the query (last confirmed). */
  applied: MultiFilters;
  /** Notifies parent of a confirmed selection. */
  onConfirm: (filters: MultiFilters) => void;
  /** Close without applying changes — staged edits are discarded. */
  onCancel: () => void;
  /** Reset all filters (staging + applied). */
  onClear: () => void;
}

const FILTER_KEYS: readonly FilterKey[] = [
  "subject",
  "style",
  "difficulty",
  "mood",
  "scene",
  "time_estimate",
  "audience",
];

export function FilterDrawer({
  open,
  applied,
  onConfirm,
  onCancel,
  onClear,
}: FilterDrawerProps) {
  const t = useTranslations("explore");
  const tEnum = useTranslations("enums");

  // Staging mirrors `applied` whenever the drawer opens.
  const [staging, setStaging] = useState<MultiFilters>(applied);

  useEffect(() => {
    if (open) setStaging(applied);
  }, [open, applied]);

  // Lock body scroll + Escape to close.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onCancel]);

  if (!open) return null;

  const optionsFor = (key: FilterKey): { value: string; label: string }[] => {
    const list =
      key === "subject"
        ? SUBJECTS
        : key === "style"
          ? STYLES
          : key === "difficulty"
            ? DIFFICULTIES
            : key === "mood"
              ? MOODS
              : key === "scene"
                ? SCENES
                : key === "time_estimate"
                  ? TIME_ESTIMATES
                  : AUDIENCES;
    const ns =
      key === "time_estimate"
        ? "time"
        : key === "audience"
          ? "audience"
          : key;
    return (list as readonly string[]).map((v) => ({
      value: v,
      label: tEnum(`${ns}.${v}`),
    }));
  };

  function toggle(key: FilterKey, value: string) {
    setStaging((prev) => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  function isDirty(): boolean {
    return FILTER_KEYS.some((k) => {
      const a = [...applied[k]].sort().join(",");
      const b = [...staging[k]].sort().join(",");
      return a !== b;
    });
  }

  const stagedCount = FILTER_KEYS.reduce(
    (s, k) => s + staging[k].length,
    0,
  );

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-slate-900">
            {t("filterTitle")}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label={t("cancel")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {FILTER_KEYS.map((key) => (
            <div key={key}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t(FILTER_LABELS[key])}
                </span>
                {staging[key].length > 0 && (
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                    {staging[key].length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {optionsFor(key).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(key, opt.value)}
                    aria-pressed={staging[key].includes(opt.value)}
                    className={
                      "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition " +
                      (staging[key].includes(opt.value)
                        ? "bg-violet-600 text-white shadow-sm hover:bg-violet-700"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700")
                    }
                  >
                    {staging[key].includes(opt.value) && (
                      <span aria-hidden>✓ </span>
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              setStaging(EMPTY_FILTERS);
              onClear();
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            {t("clearAll")}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => onConfirm(staging)}
              disabled={!isDirty() && stagedCount === 0}
              className="rounded-full bg-gradient-to-r from-violet-600 to-orange-500 px-5 py-2 text-sm font-bold text-white shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {t("apply")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}