"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// Map run view (hero, build spec §7.2) — the 10 lanes lighting up live.
// Dark "terminal" variant: violet-on-ink, the brand inverted (file 14 §10).

type LaneState = {
  key: string;
  label: string;
  mode: "live" | "local" | "dark";
  status: "idle" | "running" | "done" | "error";
  found: number;
  cost: number;
  latency: number | null;
  note?: string;
};

const INITIAL_LANES: LaneState[] = [
  { key: "sitemap", label: "01 sitemap harvest", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "customer_pages", label: "02 customer pages", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "wayback", label: "03 wayback churn diff", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "logo_diff", label: "03b logo-wall diff", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "ats", label: "04 ats job-post sweep", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "peerspot", label: "05 peerspot reviews", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "serp", label: "06 serp long-tail", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "community", label: "07 community (discourse)", mode: "local", status: "idle", found: 0, cost: 0, latency: null, note: "pre-seeded nightly — local lane" },
  { key: "procurement", label: "08 procurement (eu ted)", mode: "local", status: "idle", found: 0, cost: 0, latency: null, note: "pre-seeded nightly — local lane" },
  { key: "github", label: "09 github (verify-only)", mode: "local", status: "idle", found: 0, cost: 0, latency: null, note: "pre-seeded nightly — local lane" },
  { key: "classify", label: "10 classify · exclude · write", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
];

type FeedItem = {
  lane: string;
  org: string;
  status?: string;
  title?: string;
  masked?: boolean;
  kind: "evidence" | "exclusion" | "info";
  text?: string;
};

export default function RunPage() {
  const [domain, setDomain] = useState("cledara.com");
  const [name, setName] = useState("Cledara");
  const [lanes, setLanes] = useState<LaneState[]>(INITIAL_LANES);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string>("idle");
  const [summary, setSummary] = useState<{ orgs: number; candidates: number; excluded: number; cost: number; ms: number } | null>(null);
  const [resolvedDomain, setResolvedDomain] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const t0 = useRef(0);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => setElapsed(Date.now() - t0.current), 100);
    return () => clearInterval(iv);
  }, [running]);

  const patchLane = useCallback((key: string, patch: Partial<LaneState>) => {
    setLanes((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }, []);

  const start = useCallback((replay = false) => {
    if (running || !domain) return;
    setLanes(INITIAL_LANES.map((l) => ({ ...l })));
    setFeed([]);
    setSummary(null);
    setRunning(true);
    setStage("starting");
    t0.current = Date.now();

    // accept anything the user pastes — full URLs normalize to a bare domain
    const clean = domain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "");
    setDomain(clean);
    const es = new EventSource(
      `/api/run?domain=${encodeURIComponent(clean)}&name=${encodeURIComponent(name || clean)}${replay ? "&replay=1" : ""}`
    );
    esRef.current = es;

    es.onmessage = (ev) => {
      const e = JSON.parse(ev.data);
      switch (e.type) {
        case "run_start":
          if (e.vendor?.domain) setResolvedDomain(e.vendor.domain);
          break;
        case "stage":
          setStage(e.name);
          if (e.name === "write") patchLane("classify", { status: "running" });
          break;
        case "lane_start":
          patchLane(e.lane, { status: "running" });
          break;
        case "lane_done":
          patchLane(e.lane, {
            status: e.error ? "error" : "done",
            found: e.found,
            cost: e.cost_usd,
            latency: e.latency_ms,
            note: e.note ?? e.error,
            mode: e.error?.includes("lane dark") ? "dark" : undefined,
          } as Partial<LaneState>);
          break;
        case "evidence": {
          const p = e.row.person;
          setFeed((f) => [
            {
              lane: e.lane,
              org: e.row.org_name,
              status: e.row.status,
              title: p?.title,
              masked: Boolean(p?.full_name),
              kind: "evidence",
            },
            ...f.slice(0, 80),
          ]);
          break;
        }
        case "exclusion":
          setFeed((f) => [
            { lane: "exclude", org: e.org_name, kind: "exclusion", text: e.reason },
            ...f.slice(0, 80),
          ]);
          break;
        case "run_done":
          patchLane("classify", { status: "done", found: e.candidates, latency: e.latency_ms });
          setSummary({ orgs: e.orgs, candidates: e.candidates, excluded: e.excluded, cost: e.cost_usd, ms: e.latency_ms });
          setStage("done");
          setRunning(false);
          es.close();
          break;
        case "run_error":
          setStage(`error: ${e.error}`);
          setRunning(false);
          es.close();
          break;
      }
    };
    es.onerror = () => {
      setRunning(false);
      es.close();
    };
  }, [domain, name, running, patchLane]);

  useEffect(() => () => esRef.current?.close(), []);

  const totalCost = lanes.reduce((a, l) => a + l.cost, 0);

  return (
    <div className="dark min-h-screen bg-term-ground text-term-text">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold !text-term-text no-underline">
              Coverage Index
            </Link>
            <span className="pill border border-city-barcelona/25 bg-city-barcelona/10 !text-city-barcelona">
              map run
            </span>
          </div>
          <div className="metric flex items-center gap-5 text-xs text-term-muted">
            <span>stage <span className="text-term-accent">{stage}</span></span>
            <span>cost <span className="text-term-accent">${totalCost.toFixed(4)}</span></span>
            <span>t <span className="text-term-accent">{(elapsed / 1000).toFixed(1)}s</span></span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* name-any-company input */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-term-muted">
            vendor domain
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="vendor.com"
              className="metric w-56 rounded-md border border-term-line bg-term-surface px-3 py-2 text-sm text-term-text outline-none focus:border-term-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-term-muted">
            vendor name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vendor"
              className="w-44 rounded-md border border-term-line bg-term-surface px-3 py-2 text-sm text-term-text outline-none focus:border-term-accent"
            />
          </label>
          <button
            onClick={() => start()}
            disabled={running || !domain}
            className="rounded-md bg-term-accent px-5 py-2 text-sm font-medium text-ink transition-opacity disabled:opacity-40"
          >
            {running ? "running…" : "map this vendor"}
          </button>
          <button
            onClick={() => start(true)}
            disabled={running || !domain}
            title="re-stream the last run from the journal — no upstream requests, no cost"
            className="rounded-md border border-term-line px-4 py-2 text-sm text-term-soft transition-colors hover:border-term-accent hover:text-term-accent disabled:opacity-40"
          >
            replay last run
          </button>
          {summary && (
            <Link
              href={`/book/${resolvedDomain ?? domain}`}
              className="rounded-md border border-term-accent/40 px-5 py-2 text-sm !text-term-accent no-underline hover:border-term-accent"
            >
              open the book →
            </Link>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* lane board */}
          <section className="min-w-0">
            <h2 className="provenance mb-2 uppercase tracking-wider !text-term-muted">lanes</h2>
            <div className="flex flex-col gap-1.5">
              {lanes.map((l) => (
                <div
                  key={l.key}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                    l.status === "running"
                      ? "lane-active border-term-accent/40 bg-term-surface"
                      : "border-term-line bg-term-surface"
                  }`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      l.status === "done"
                        ? "bg-city-london"
                        : l.status === "running"
                        ? "bg-city-barcelona"
                        : l.status === "error"
                        ? l.mode === "dark"
                          ? "bg-city-sanjose"
                          : "bg-error"
                        : l.mode === "local"
                        ? "bg-term-dim"
                        : "bg-term-line-bright"
                    }`}
                  />
                  <span className="metric w-52 shrink-0 text-[13px] text-term-text">{l.label}</span>
                  <span className="metric w-14 text-right text-[13px] text-term-accent">
                    {l.found > 0 ? l.found : "·"}
                  </span>
                  <span className="metric w-20 text-right text-xs text-term-soft">
                    {l.cost > 0 ? `$${l.cost.toFixed(4)}` : "$0"}
                  </span>
                  <span className="metric w-16 text-right text-xs text-term-mid">
                    {l.latency != null ? `${(l.latency / 1000).toFixed(1)}s` : "—"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-term-muted">
                    {(l.note ?? "").slice(0, 140)}
                  </span>
                </div>
              ))}
            </div>
            {summary && (
              <div className="metric mt-4 rounded-md border border-term-accent/30 bg-term-surface px-4 py-3 text-sm">
                <span className="text-term-accent">{summary.candidates}</span> candidates ·{" "}
                <span className="text-term-accent">{summary.orgs}</span> org keys ·{" "}
                <span className="text-term-accent">{summary.excluded}</span> excluded (reasons stored) ·{" "}
                <span className="text-term-accent">${summary.cost.toFixed(4)}</span> ·{" "}
                <span className="text-term-accent">{(summary.ms / 1000).toFixed(0)}s</span>
              </div>
            )}
          </section>

          {/* evidence feed */}
          <section className="min-w-0">
            <h2 className="provenance mb-2 uppercase tracking-wider !text-term-muted">
              evidence stream <span className="normal-case">(identities masked — unmask lives in the book)</span>
            </h2>
            <div className="flex max-h-[520px] flex-col gap-1 overflow-y-auto pr-1">
              {feed.length === 0 && (
                <p className="text-sm text-term-muted">
                  waiting for a run — evidence rows appear here as lanes find them
                </p>
              )}
              {feed.map((f, i) => (
                <div
                  key={i}
                  className={`rounded-md border px-3 py-1.5 text-xs ${
                    f.kind === "exclusion"
                      ? "border-city-newdelhi/25 bg-city-newdelhi/10"
                      : "border-term-line bg-term-surface"
                  }`}
                >
                  {f.kind === "exclusion" ? (
                    <span className="text-city-newdelhi">
                      excluded @ {f.org} — <span className="metric">{f.text}</span>
                    </span>
                  ) : (
                    <span>
                      <span className="metric text-term-soft">[{f.lane}]</span>{" "}
                      <span className="text-term-text">{f.org}</span>
                      {f.title && <span className="text-term-muted"> · [NAME], {f.title}</span>}
                      {f.status && (
                        <span
                          className={`ml-2 ${
                            f.status === "churned" ? "text-city-newdelhi" : "text-city-london"
                          }`}
                        >
                          {f.status}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
