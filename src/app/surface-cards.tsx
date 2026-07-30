"use client";

import Link from "next/link";
import { useRef } from "react";

// The five surface cards — landing grid. Client component only for the
// cursor-spotlight (--mx/--my set from ONE container mousemove listener).

const SURFACES: {
  href: string;
  title: string;
  line: string;
  pill: string;
  pillBg: string;
  span: string;
  primary?: boolean;
}[] = [
  {
    href: "/coverage",
    title: "Coverage board",
    line: "Every vendor we index, how deep its book is, and what gets mapped next.",
    pill: "live",
    pillBg: "bg-city-london",
    span: "lg:col-span-3",
  },
  {
    href: "/run",
    title: "Map run",
    line: "Ten lanes pull evidence live, each showing what it found, cost and time.",
    pill: "live",
    pillBg: "bg-city-london",
    span: "lg:col-span-3",
    primary: true,
  },
  {
    href: "/book/cledara.com",
    title: "Book view",
    line: "The people we can name, the evidence behind each one, and who we ruled out.",
    pill: "masked",
    pillBg: "bg-city-sanjose",
    span: "lg:col-span-2",
  },
  {
    href: "/burst",
    title: "Burst view",
    line: "The 30-day clock: what happens when, how we reach 20 reviews, what it costs.",
    pill: "simulated",
    pillBg: "bg-city-sanjose",
    span: "lg:col-span-2",
  },
  {
    href: "/loop",
    title: "Activation loop",
    line: "The sign-up page, the five-review unlock, and colleague invites.",
    pill: "always-on",
    pillBg: "bg-city-barcelona",
    span: "sm:col-span-2 lg:col-span-2",
  },
];

export default function SurfaceCards() {
  const gridRef = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const cards = gridRef.current?.querySelectorAll<HTMLElement>("[data-spot]");
    if (!cards) return;
    for (const card of cards) {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
  }

  return (
    <div
      ref={gridRef}
      onMouseMove={onMove}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      {SURFACES.map((s) => (
        <Link
          key={s.href}
          href={s.href}
          data-spot
          className={`pane pane-lift spot group relative flex flex-col p-5 no-underline ${s.span}`}
        >
          {s.primary && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[12px] bg-gradient-to-br from-violet-50 via-transparent to-transparent"
            />
          )}
          <div className="relative z-[1] flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              {s.primary && (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-violet-400 shadow-[var(--shadow-glow-violet)]">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M1.5 2.5h9M1.5 6h6M1.5 9.5h7.5"
                      stroke="white"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              )}
              <span className="truncate text-title text-ink">{s.title}</span>
            </span>
            <span className={`pill shrink-0 ${s.pillBg}`}>{s.pill}</span>
          </div>
          <p className="relative z-[1] mt-1.5 text-dense text-subtle-deep">{s.line}</p>
          <span className="relative z-[1] mt-auto flex items-center gap-1 pt-4 text-control text-violet-link">
            Open
            <span
              aria-hidden
              className="inline-block transition-transform duration-150 group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
