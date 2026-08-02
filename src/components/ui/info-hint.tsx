"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The product's ONE progressive-disclosure idiom: a quiet ⓘ that opens a
// small pane with the rationale. Surfaces stay terse; the why lives here.
// Click to toggle, Esc/outside to close. Works on paper and terminal.
// The panel renders in a body portal with fixed positioning so it can never
// be layered under sibling panes (transform stacking contexts) or clipped
// by overflow-x-auto table wrappers.

const PANEL_W = 288; // w-72
const GAP = 6;
const MARGIN = 8;

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
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      let left = align === "right" ? r.right - PANEL_W : r.left;
      left = Math.min(Math.max(left, MARGIN), window.innerWidth - PANEL_W - MARGIN);
      setPos({ top: r.bottom + GAP, left });
    };
    place();
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, align]);

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
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_W }}
            className="pane z-[80] p-3.5 text-dense leading-relaxed text-ink-60 dark:text-term-muted"
          >
            {children}
          </div>,
          document.body
        )}
    </span>
  );
}
