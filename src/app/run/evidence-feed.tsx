"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import InfoHint from "@/components/ui/info-hint";
import type { FeedItem } from "./run-types";

// The right column: evidence rows sliding in as lanes stream them.
// Status words on paper: current = deep green, churned = warm orange;
// exclusions get the warn treatment with the reason in mono.

function statusColor(s: string): string {
  if (s === "current") return "text-success-text";
  if (s === "churned") return "text-warn-text";
  return "text-subtle";
}

export default function EvidenceFeed({ feed, idle }: { feed: FeedItem[]; idle: boolean }) {
  const [listRef] = useAutoAnimate<HTMLDivElement>({ duration: 180 });

  return (
    <>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="eyebrow">Evidence stream</span>
        {/* contract label — same hue as the book's masked pill */}
        <span className="pill bg-city-sanjose">masked</span>
        <InfoHint align="right">
          This stream never carries a full name. You reveal people in the book,
          one at a time.
        </InfoHint>
      </div>
      {feed.length === 0 && (
        <div className="rounded-xl border border-dashed border-line-strong/60 px-6 py-14 text-center">
          <p className="font-mono text-caption text-subtle-disabled">
            {idle ? "Name a vendor to map" : "Waiting for first evidence…"}
          </p>
        </div>
      )}
      <div ref={listRef} className="tracker-scroll flex max-h-[560px] flex-col gap-1 overflow-y-auto pr-1">
        {feed.map((f) => (
          <div
            key={f.id}
            className={`rounded-[10px] border px-3 py-1.5 text-dense ${
              f.kind === "exclusion"
                ? "border-warn-border bg-warn-bg"
                : "border-line bg-card shadow-[var(--shadow-card)]"
            }`}
          >
            {f.kind === "exclusion" ? (
              <span className="text-warn-text">
                excluded · <span className="font-medium">{f.org}</span>{" "}
                <span className="metric text-caption text-warn-text/80">{f.text}</span>
              </span>
            ) : (
              <span>
                <span className="metric text-caption text-ink-35">[{f.lane}]</span>{" "}
                <span className="font-medium text-ink">{f.org}</span>
                {f.title && <span className="text-subtle"> · [NAME], {f.title}</span>}
                {f.status && <span className={`ml-2 ${statusColor(f.status)}`}>{f.status}</span>}
              </span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
