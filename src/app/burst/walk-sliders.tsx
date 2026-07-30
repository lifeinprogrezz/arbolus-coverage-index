"use client";

import { useState } from "react";

// The §5.1 walk-to-20 as sliders — the brief's own ask ("where you need to
// make assumptions, make them"). Defaults = the base case; the REAL book's
// seeds/reservoir feed the starting positions.

interface Props {
  defaultSeeds: number;
  defaultReservoir: number;
}

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
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="metric text-sm text-violet-link">
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
        className="mt-1 w-full accent-[#5C58E8]"
      />
      <div className="text-[11px] text-warn-text">[ASSUMPTION] {assumption}</div>
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

  const VERIFY = 0.8;
  const seedYield = seeds * 0.8 * 0.92 * (reply / 100) * 0.55 * VERIFY;
  const converters = reservoir + seedYield;
  const inviteYield = coeff * converters * VERIFY;
  const total =
    reservoir + seedYield + inviteYield + community * VERIFY + mail * VERIFY;
  const gap = Math.max(0, 20 - total);

  return (
    <div className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">Move the assumptions</h3>
        <span className="provenance">defaults = base case · seeds/reservoir from the real book</span>
      </div>
      <div className="mt-2 grid gap-x-8 sm:grid-cols-2">
        <Slider label="Reservoir hits" unit="" min={0} max={8} step={1} value={reservoir} onChange={setReservoir} assumption="org-join ratio — the experiment's first falsifiable claim" />
        <Slider label="Named seeds in the book" unit="" min={5} max={30} step={1} value={seeds} onChange={setSeeds} assumption="public-evidence yield per niche vendor (spot-checks, not census)" />
        <Slider label="Reply rate" unit="%" min={1} max={15} step={1} value={reply} onChange={setReply} assumption="the binding lever — 3% cold vs 10% optimistic (prepaid-vs-promised gap)" />
        <Slider label="Invite coefficient / converter" unit="" min={0} max={2} step={0.1} value={coeff} onChange={setCoeff} assumption="0.5–1.5 per converter, GLG-style CPA-conditional" />
        <Slider label="Community placements" unit="" min={0} max={6} step={1} value={community} onChange={setCommunity} assumption="per-community one-off BD, capped" />
        <Slider label="Physical mail yield" unit="" min={0} max={4} step={1} value={mail} onChange={setMail} assumption="~0.8 at the 1% cold baseline" />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-4">
        <div>
          <div className="provenance">projected verified</div>
          <div className={`metric text-3xl ${total >= 20 ? "text-success" : "text-ink"}`}>
            {total.toFixed(1)}
          </div>
        </div>
        <div className="max-w-md text-sm text-subtle">
          {total >= 20 ? (
            <>Clears 20 on these settings — verification factor (0.8) applied to every non-reservoir line.</>
          ) : (
            <>
              <span className="metric text-warn-text">{gap.toFixed(1)} short</span> — the priced
              escalation branch closes it: (1) extend clock + re-map · (2) escalate the bounty
              (scarcity elasticity, the proven lever) · (3) vendor-mediated, sourcing-labelled, last
              resort.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
