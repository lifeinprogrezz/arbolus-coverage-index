"use client";

import { useState } from "react";

// Company mark with graceful fallback chain: favicon service → colored
// initial chip (hue derived from the name — stable across renders).
// Theme-aware sizing; never a broken-image glyph.

function hueFor(name: string): number {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function CoLogo({
  name,
  domain,
  size = 24,
}: {
  name: string;
  domain?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initial = (name?.[0] ?? "?").toUpperCase();

  if (!domain || failed) {
    return (
      <span
        className="inline-flex shrink-0 items-center justify-center rounded-[6px] font-mono font-bold text-white"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.5,
          background: `hsl(${hueFor(name)} 32% 46%)`,
        }}
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-[6px] bg-white object-contain ring-1 ring-line"
      style={{ width: size, height: size }}
    />
  );
}
