"use client";

import { CountTicker } from "@/components/ui/ticker";
import { LOCAL_NOTE, type LaneState } from "./run-types";

// The lanes as instrument rows on paper: numbered mono label, status dot,
// found / cost / time numerals, and the lane's own note.
// Status hues: running = violet (motion), done = green, dark/off = neutral.

function dotClass(l: LaneState): string {
  if (l.status === "running") return "animate-pulse bg-city-barcelona ring-2 ring-city-barcelona/30";
  if (l.status === "done") return "bg-success";
  if (l.status === "error") return l.mode === "dark" ? "bg-line-warm" : "bg-error";
  if (l.mode === "local") return "bg-line-warm";
  return "bg-ink-25";
}

export default function LaneBoard({ lanes, idle }: { lanes: LaneState[]; idle: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 transition-opacity duration-300 ${idle ? "opacity-70" : ""}`}>
      {lanes.map((l) => {
        const m = l.label.match(/^(\S+)\s+(.*)$/);
        const num = m?.[1] ?? "";
        const name = m?.[2] ?? l.label;
        const note = l.note === LOCAL_NOTE ? "" : l.note ?? "";
        const dimmedLocal = l.mode === "local" && l.status === "idle";
        return (
          <div
            key={l.key}
            className={`pane flex items-center gap-3 px-3.5 py-2 transition-opacity duration-200 ${
              l.status === "running" ? "lane-active" : ""
            } ${dimmedLocal ? "opacity-60" : ""}`}
            title={note || undefined}
          >
            <span className="metric w-7 shrink-0 text-caption text-subtle-disabled">{num}</span>
            <span
              className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-200 ${dotClass(l)}`}
              aria-hidden
            />
            <span
              className={`min-w-0 flex-1 truncate text-control font-medium transition-colors duration-200 md:w-52 md:flex-none ${
                l.status === "running"
                  ? "text-violet-link"
                  : dimmedLocal
                  ? "text-subtle-disabled"
                  : "text-ink"
              }`}
            >
              {name}
            </span>
            {l.mode === "local" && (
              <span className="hidden shrink-0 rounded-full border border-line-warm px-2 py-px font-mono text-micro uppercase tracking-[0.06em] text-subtle sm:inline">
                nightly · local
              </span>
            )}
            <CountTicker
              value={l.found}
              className={`w-12 shrink-0 text-right text-control transition-colors duration-200 ${
                l.status === "done" ? "text-violet-link" : "text-ink-25"
              }`}
            />
            {/* cost + time step aside below sm so the lane NAME stays readable
                on a 390 screen — the run total still lands in the banner */}
            <span
              className={`metric hidden w-16 shrink-0 text-right text-caption sm:inline ${
                l.cost > 0 ? "text-subtle" : "text-ink-25"
              }`}
            >
              {l.cost > 0 ? `$${l.cost.toFixed(4)}` : "·"}
            </span>
            <span className="metric hidden w-12 shrink-0 text-right text-caption text-subtle-disabled sm:inline">
              {l.latency != null ? `${(l.latency / 1000).toFixed(1)}s` : "—"}
            </span>
            {/* note: one clipped line on md, two wrapped lines from lg up —
                wide screens have the room, so don't cut the sentence off */}
            <span className="hidden min-w-0 flex-1 text-caption text-subtle max-lg:truncate md:block lg:line-clamp-2 lg:whitespace-normal">
              {note.slice(0, 140)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
