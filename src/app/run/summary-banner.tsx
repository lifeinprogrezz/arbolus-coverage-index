"use client";

import Link from "next/link";
import InfoHint from "@/components/ui/info-hint";
import { CountTicker, MoneyTicker } from "@/components/ui/ticker";

// The run_done banner: four big numerals carry the argument, the violet
// CTA hands off to the book. The exclusions caveat lives in an InfoHint.

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-1.5 flex items-center gap-1 font-mono text-micro uppercase tracking-[0.08em] text-subtle">
      {children}
    </span>
  );
}

export default function SummaryBanner({
  candidates,
  orgs,
  excluded,
  cost,
  ms,
  bookHref,
}: {
  candidates: number;
  orgs: number;
  excluded: number;
  cost: number;
  ms: number;
  bookHref: string;
}) {
  return (
    <div className="pane reveal mt-5 px-6 py-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
        <div className="flex flex-1 flex-wrap items-end gap-x-8 gap-y-5">
          <div className="flex flex-col">
            <CountTicker value={candidates} className="text-display leading-none text-violet-link" />
            <Caption>candidates</Caption>
          </div>
          <div className="flex flex-col">
            <CountTicker value={orgs} className="text-display leading-none text-ink" />
            <Caption>companies</Caption>
          </div>
          <div className="flex flex-col">
            <CountTicker value={excluded} className="text-display leading-none text-ink" />
            <Caption>
              excluded
              <InfoHint>
                Every company we exclude is kept with the reason why. Nothing is
                dropped quietly.
              </InfoHint>
            </Caption>
          </div>
          <div className="flex flex-col">
            {/* same number the header chip shows — both read run_done.cost_usd */}
            <MoneyTicker value={cost} className="text-display leading-none text-ink" />
            <Caption>cost this run</Caption>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Link
            href={bookHref}
            className="rounded-md border border-violet-200 bg-violet-50 px-5 py-2.5 text-control font-medium !text-violet-link no-underline transition-all duration-150 hover:border-violet-400 active:translate-y-px"
          >
            open the book →
          </Link>
          <span className="metric text-caption text-subtle-disabled">{(ms / 1000).toFixed(1)}s run</span>
        </div>
      </div>
    </div>
  );
}
