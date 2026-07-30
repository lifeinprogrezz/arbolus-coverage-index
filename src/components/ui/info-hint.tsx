"use client";

import { useEffect, useRef, useState } from "react";

// The product's ONE progressive-disclosure idiom: a quiet ⓘ that opens a
// small pane with the rationale. Surfaces stay terse; the why lives here.
// Click to toggle, Esc/outside to close. Works on paper and terminal.

export default function InfoHint({
  label,
  children,
  align = "left",
}: {
  label?: string; // optional short trigger text next to the glyph
  children: React.ReactNode; // the explanation content
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={label ? `About: ${label}` : "More context"}
        className={`inline-flex items-center gap-1 rounded-full text-caption transition-colors ${
          open ? "text-violet-link" : "text-subtle hover:text-ink dark:hover:text-term-text"
        }`}
      >
        {label && <span className="font-mono uppercase tracking-[0.06em]">{label}</span>}
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          className={`pane absolute top-6 z-30 w-72 p-3.5 text-dense leading-relaxed text-ink-60 dark:text-term-muted ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </span>
  );
}
