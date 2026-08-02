"use client";

import { useState } from "react";
import Assume from "./assume";

// The §5.1 walk-to-20 as sliders — the brief's own ask ("where you need to
// make assumptions, make them"). Defaults = the base case; the REAL book's
// seeds/reservoir feed the starting positions.

interface Props {
  defaultSeeds: number;
  defaultReservoir: number;
}

const VERIFY = 0.8;
const SCALE = 30; // bar scale; the 20-target marker sits at 20/SCALE

function Slider({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  assumption,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  assumption: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-dense font-medium text-ink">
          {label}
          <Assume>{assumption}</Assume>
        </span>
        <span className="metric shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-caption text-violet-link">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="wk-range mt-2 w-full"
        style={{ "--fill": `${pct}%` } as React.CSSProperties}
        aria-label={label}
      />
    </div>
  );
}

export default function WalkSliders({ defaultSeeds, defaultReservoir }: Props) {
  const [reservoir, setReservoir] = useState(Math.min(Math.max(defaultReservoir, 0), 8));
  const [seeds, setSeeds] = useState(Math.min(Math.max(defaultSeeds, 5), 30));
  const [reply, setReply] = useState(10);
  const [coeff, setCoeff] = useState(1.0);
  const [community, setCommunity] = useState(3);
  const [mail, setMail] = useState(1);

  const seedYield = seeds * 0.8 * 0.92 * (reply / 100) * 0.55 * VERIFY;
  const converters = reservoir + seedYield;
  const inviteYield = coeff * converters * VERIFY;
  const total =
    reservoir + seedYield + inviteYield + community * VERIFY + mail * VERIFY;
  const gap = Math.max(0, 20 - total);
  const hit = total >= 20;
  const markerLeft = (20 / SCALE) * 100;

  return (
    <div className="pane p-5">
      <style>{`
        .wk-range{appearance:none;-webkit-appearance:none;height:3px;border-radius:999px;background:linear-gradient(to right,var(--color-violet-link) var(--fill,50%),rgba(11,26,29,.08) var(--fill,50%));outline:none;cursor:pointer}
        .wk-range::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;height:14px;width:14px;border-radius:999px;background:#fff;border:1.5px solid var(--color-violet-link);box-shadow:0 1px 3px rgba(11,26,29,.18);transition:transform 120ms ease,box-shadow 120ms ease}
        .wk-range::-webkit-slider-thumb:hover{transform:scale(1.15);box-shadow:0 2px 6px rgba(92,88,232,.35)}
        .wk-range::-webkit-slider-thumb:active{transform:scale(1.05)}
        .wk-range::-moz-range-thumb{height:14px;width:14px;border-radius:999px;background:#fff;border:1.5px solid var(--color-violet-link);box-shadow:0 1px 3px rgba(11,26,29,.18);transition:transform 120ms ease}
        .wk-range::-moz-range-thumb:hover{transform:scale(1.15)}
        .wk-range::-moz-range-track{height:3px;border-radius:999px;background:transparent}
      `}</style>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-control font-semibold text-ink">Move the assumptions</h3>
        <span className="provenance">
          defaults are the base case · people and experts come from the real book
        </span>
      </div>

      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
        <Slider label="Experts we already have" unit="" min={0} max={8} step={1} value={reservoir} onChange={setReservoir} assumption="How often one of our experts already works at a company in the book. The first claim this experiment can prove or disprove." />
        <Slider label="People we can name" unit="" min={5} max={30} step={1} value={seeds} onChange={setSeeds} assumption="How many people public evidence turns up for a niche vendor. Spot-checked, not counted end to end." />
        <Slider label="Reply rate" unit="%" min={1} max={15} step={1} value={reply} onChange={setReply} assumption="The line that decides the result: 3% cold, 10% optimistic because the money is named up front." />
        <Slider label="Invites per person who joins" unit="" min={0} max={2} step={0.1} value={coeff} onChange={setCoeff} assumption="0.5–1.5 each, paid only when the invited review lands, the way GLG does it." />
        <Slider label="Community placements" unit="" min={0} max={6} step={1} value={community} onChange={setCommunity} assumption="One-off deal per community, with the spend capped." />
        <Slider label="Reviews from letters" unit="" min={0} max={4} step={1} value={mail} onChange={setMail} assumption="About 0.8 at the usual 1% cold rate." />
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-3 border-t border-line pt-4">
        <div className="min-w-[190px] flex-1">
          <div className="eyebrow">projected verified reviews</div>
          <div className={`metric text-display transition-colors ${hit ? "text-success" : "text-ink"}`}>
            {total.toFixed(1)}
          </div>
          {/* 20-target bar with hairline marker */}
          <div className="relative mb-5 mt-2.5 h-1.5 rounded-full bg-ink/[.07]">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-200 ${hit ? "bg-success" : "bg-violet-link"}`}
              style={{ width: `${Math.min((total / SCALE) * 100, 100)}%` }}
            />
            <div
              className="absolute -bottom-[3px] -top-[3px] w-px bg-ink-35"
              style={{ left: `${markerLeft}%` }}
            />
            <span
              className="metric absolute top-2.5 -translate-x-1/2 text-micro text-subtle"
              style={{ left: `${markerLeft}%` }}
            >
              20
            </span>
          </div>
        </div>
        <p className="max-w-sm text-pretty pt-1 text-dense text-subtle">
          {hit ? (
            <>
              Clears 20 on these settings. We keep 80% of every line after
              verification, except the experts we already have.
            </>
          ) : (
            <>
              <span className="metric text-warn-text">{gap.toFixed(1)} short</span>. Three
              ways to close it: run the clock longer and re-map, raise the bounty (the one
              lever we know works), or ask the vendor to introduce us as a last resort.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
