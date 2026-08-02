"use client";

import Link from "next/link";
import { useState } from "react";
import { vendorName } from "../vendor-name";

// Vendor switcher for the burst view. Shows the most recently mapped eight;
// typing filters the whole catalogue. A query that matches nothing becomes
// the map-now action — the burst can point at a vendor we haven't indexed.

export default function VendorPicker({
  vendors,
  current,
}: {
  vendors: { name: string; domain: string }[];
  current?: string;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  let shown: typeof vendors;
  if (query) {
    shown = vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(query) ||
        v.domain.toLowerCase().includes(query)
    );
  } else {
    shown = vendors.slice(0, 8);
    if (current && !shown.some((v) => v.domain === current)) {
      const cur = vendors.find((v) => v.domain === current);
      if (cur) shown = [cur, ...shown.slice(0, 7)];
    }
  }

  return (
    <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`filter ${vendors.length} vendors`}
        aria-label="Filter vendors"
        className="w-40 rounded-md border border-line bg-card px-2.5 py-1 font-mono text-caption text-ink transition-colors placeholder:text-ink-35 focus:border-violet-300 focus:outline-none"
      />
      {shown.map((v) => (
        <Link
          key={v.domain}
          href={`/burst?vendor=${v.domain}`}
          className={`pill no-underline transition-colors active:translate-y-px ${
            v.domain === current
              ? "bg-city-barcelona"
              : "bg-ground-tint hover:bg-ground-tint-hover"
          }`}
        >
          {vendorName(v.name)}
        </Link>
      ))}
      {query && shown.length === 0 && (
        <Link
          href={`/run?domain=${encodeURIComponent(q.trim())}`}
          className="whitespace-nowrap rounded-md border border-violet-200 bg-violet-50 px-2.5 py-1 text-caption font-medium !text-violet-link no-underline transition-all hover:border-violet-400 hover:shadow-[var(--shadow-glow-violet)]"
        >
          not indexed — map &ldquo;{q.trim()}&rdquo;
        </Link>
      )}
      {!query && vendors.length > 8 && (
        <span className="provenance whitespace-nowrap">
          +{vendors.length - 8} more · type to find
        </span>
      )}
    </div>
  );
}
