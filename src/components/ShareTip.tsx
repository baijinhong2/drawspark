"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "drawspark:share-tip-dismissed";

/**
 * First-time-only tip near the comment box.
 * Remembers dismissal in localStorage so it only shows once per device.
 */
export function ShareTip() {
  const t = useTranslations("shareTip");
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setShow(false);
  }

  return (
    <div
      role="note"
      className="relative mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-base">
          💡
        </span>
        <div className="flex-1 leading-relaxed">
          <strong className="font-semibold">{t("title")}</strong>{" "}
          {t("body")}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="flex-shrink-0 text-amber-700 hover:text-amber-900"
        >
          ✕
        </button>
      </div>
      {/* Arrow pointing down toward the comment box */}
      <span
        aria-hidden
        className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-amber-200 bg-amber-50"
      />
    </div>
  );
}