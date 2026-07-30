"use client";

// The run's spine: sitemap → evidence → ats → write → reservoir → compose.
// Reads the SSE `stage` events already held in page state.
// Hues on paper: in progress = violet, finished = green, not yet = dim ink.

const STAGES = ["sitemap", "evidence", "ats", "write", "reservoir", "compose"];

export default function StageFlow({ stage }: { stage: string }) {
  const idx = STAGES.indexOf(stage);
  const allDone = stage === "done";
  const parked = allDone || stage === "idle" || stage.startsWith("error");
  // A stage name the rail doesn't know ("starting", "replay — cached run…")
  // pins to the FIRST step, so kicking off a run visibly rewinds the rail
  // instead of leaving the previous run's steps lit.
  const at = idx >= 0 ? idx : parked ? -1 : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 py-1">
      {STAGES.map((s, i) => {
        const done = allDone || (at >= 0 && i < at);
        const current = !allDone && i === at;
        return (
          <div key={s} className="flex items-center gap-2 whitespace-nowrap">
            {i > 0 && (
              <span
                className={`h-px w-4 shrink-0 transition-colors duration-200 sm:w-8 ${
                  current ? "bg-violet-300" : done ? "bg-success/40" : "bg-line"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`flex items-center gap-1.5 font-mono text-caption uppercase tracking-[0.08em] transition-colors duration-200 ${
                current
                  ? "text-violet-link"
                  : done
                  ? "text-success-text/80"
                  : "text-ink-25"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  current
                    ? "animate-pulse bg-violet-link"
                    : done
                    ? "bg-success"
                    : "bg-ink-25"
                }`}
                aria-hidden
              />
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}
