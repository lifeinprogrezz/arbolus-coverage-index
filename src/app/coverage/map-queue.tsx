"use client";

import { useRef } from "react";
import Link from "next/link";
import CoLogo from "@/components/ui/co-logo";
import type { QueueRow } from "@/lib/engine/demand";
import { vendorName } from "../vendor-name";

// Demand-ranked queue rows as spotlight panes. One container mousemove
// listener drives --mx/--my for every .spot card (the globals.css contract).

const SIGNAL_PILL: Record<string, string> = {
  "searched-empty": "bg-city-newyork",
  funding: "bg-city-newdelhi",
  "client-view": "bg-city-barcelona",
};

// Plain-English names for the raw signal keys the demand engine emits.
const SIGNAL_LABEL: Record<string, string> = {
  "searched-empty": "searched, found nothing",
  funding: "raised funding",
  "client-view": "a client opened it",
  watchlist: "on a client watchlist",
  "competitor-of-indexed": "competitor of a vendor we index",
};

function signalLabel(s: string): string {
  return SIGNAL_LABEL[s] ?? s.replace(/[-_]/g, " ");
}

export default function MapQueue({ rows }: { rows: QueueRow[] }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent) {
    const root = ref.current;
    if (!root) return;
    for (const card of root.querySelectorAll<HTMLElement>(".spot")) {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
  }

  return (
    <div ref={ref} onMouseMove={onMove} className="flex flex-col gap-2">
      {rows.map((q, i) => (
        <div
          key={q.id}
          className="pane pane-lift spot flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
        >
          <span className="metric w-7 shrink-0 text-right text-title text-ink-35">
            {i + 1}
          </span>
          <CoLogo name={q.name} domain={q.domain} size={26} />
          <div className="w-44 min-w-0">
            <div className="truncate text-control font-medium text-ink">
              {vendorName(q.name)}
            </div>
            <div className="provenance truncate">{q.domain}</div>
          </div>
          <span
            className="metric w-12 shrink-0 text-right text-control text-violet-link"
            title="demand score"
          >
            {q.demand_score.toFixed(1)}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {q.signals.map((s) => (
              <span key={s} className={`pill ${SIGNAL_PILL[s] ?? "bg-city-sanjose"}`}>
                {signalLabel(s)}
              </span>
            ))}
          </div>
          <span
            className={`pill ml-auto whitespace-nowrap ${
              q.mapped ? "bg-city-newdelhi" : "bg-city-sanjose"
            }`}
          >
            {q.mapped ? "re-map queued" : "not indexed yet"}
          </span>
          <Link
            href={`/run?domain=${encodeURIComponent(q.domain)}&name=${encodeURIComponent(q.name)}`}
            className="whitespace-nowrap text-control"
          >
            {q.mapped ? "re-map →" : "map now →"}
          </Link>
        </div>
      ))}
    </div>
  );
}
