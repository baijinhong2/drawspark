"use client";

import { useEffect, useRef, useState } from "react";

const EMOJIS = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
  "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "☺️", "😚",
  "🥳", "🤗", "🤔", "🤭", "🤫", "🤥", "😴", "😪", "🤤", "😋",
  "🥺", "😎", "🤓", "🤩", "🥶", "🥵", "😱", "😨", "😰", "😢",
  "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥴", "😵",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
  "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "♥️", "💌",
  "🎉", "🎊", "🎈", "🎂", "🍰", "✨", "⭐", "🌟", "💫", "🔥",
  "🌹", "🌸", "🌷", "🌻", "🌼", "🌺", "🌿", "🍀", "🌱", "🌳",
  "👍", "👎", "👏", "🙌", "👌", "✌️", "🤞", "🤟", "🤘", "🤙",
  "👋", "🙋", "🖐️", "✋", "🖖", "👈", "👉", "👆", "👇", "☝️",
];

interface EmojiPickerProps {
  onPick: (emoji: string) => void;
  disabled?: boolean;
}

export function EmojiPicker({ onPick, disabled }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function pick(emoji: string) {
    onPick(emoji);
    // Keep open so user can pick multiple in a row.
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-label="Emoji"
        aria-expanded={open}
        className="rounded-lg p-2 text-lg transition hover:bg-slate-100 disabled:opacity-50"
      >
        😊
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-10 mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="grid max-h-56 grid-cols-10 gap-1 overflow-y-auto">
            {EMOJIS.map((e, i) => (
              <button
                key={`${e}-${i}`}
                type="button"
                onClick={() => pick(e)}
                className="rounded-md p-1 text-xl transition hover:bg-violet-100"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}