"use client";

import { useRef } from "react";

// The four compounding-loop stat tiles: .pane .spot with the cursor
// spotlight driven by ONE container mousemove listener (per-card coords
// so each radial gradient tracks the cursor inside its own box).

export interface LoopMetric {
  name: string;
  value: string;
  threshold: string;
  detail: string;
}

export default function MetricTiles({ metrics }: { metrics: LoopMetric[] }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const root = ref.current;
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>(".spot")) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    }
  };

  return (
    <div ref={ref} onMouseMove={onMove} className="grid grid-cols-2 gap-3">
      {metrics.map((m) => (
        <div key={m.name} className="pane spot pane-lift p-4">
          <div className="text-caption font-medium text-subtle">{m.name}</div>
          <div className="metric mt-1 text-page text-ink">{m.value}</div>
          <div className="mt-1.5 inline-flex rounded-full bg-city-london/70 px-1.5 py-px">
            <span className="metric text-micro text-success-text">{m.threshold}</span>
          </div>
          <p className="mt-1.5 text-caption leading-snug text-subtle">{m.detail}</p>
        </div>
      ))}
    </div>
  );
}
