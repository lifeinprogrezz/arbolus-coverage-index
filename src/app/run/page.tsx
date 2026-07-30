"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/shell/app-header";
import InfoHint from "@/components/ui/info-hint";
import { MoneyTicker, SecondsTicker } from "@/components/ui/ticker";
import { INITIAL_LANES, type FeedItem, type LaneState } from "./run-types";
import StageFlow from "./stage-flow";
import LaneBoard from "./lane-board";
import EvidenceFeed from "./evidence-feed";
import SummaryBanner from "./summary-banner";

// Map run view (hero, build spec §7.2) — the lanes lighting up live.
// Paper skin like every other surface (Rober's call, 7-30): one light
// system across the product. State + SSE wiring live here; the render
// lives in the sub-components.

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
  const [mode, setMode] = useState<"live" | "replay" | null>(null); // which button fired
  const [dimming, setDimming] = useState(false); // brief blank so a re-run visibly resets
  const esRef = useRef<EventSource | null>(null);
  const dimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t0 = useRef(0);
  const seq = useRef(0); // stable feed keys — auto-animate needs identity across prepends

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
    // A re-run (live OR replay) must LOOK like a reset before anything streams:
    // close any open stream, blank the lanes / feed / banner, rewind the rail,
    // and hold the board dim for a beat so the lanes visibly re-light.
    esRef.current?.close();
    setLanes(INITIAL_LANES.map((l) => ({ ...l })));
    setFeed([]);
    setSummary(null);
    setElapsed(0);
    setMode(replay ? "replay" : "live");
    setRunning(true);
    setStage("starting");
    setDimming(true);
    if (dimTimer.current) clearTimeout(dimTimer.current);
    dimTimer.current = setTimeout(() => setDimming(false), 320);
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
            // only override mode when the lane went dark — a plain spread of
            // `mode: undefined` would wipe the "local" tag on lane_done
            ...(e.error?.includes("lane dark") ? { mode: "dark" as const } : {}),
          } as Partial<LaneState>);
          break;
        case "evidence": {
          const p = e.row.person;
          setFeed((f) => [
            {
              id: ++seq.current,
              lane: e.lane,
              org: e.row.org_name,
              status: e.row.status,
              title: p?.title,
              masked: Boolean(p?.full_name),
              kind: "evidence" as const,
            },
            ...f.slice(0, 80),
          ]);
          break;
        }
        case "exclusion":
          setFeed((f) => [
            { id: ++seq.current, lane: "exclude", org: e.org_name, kind: "exclusion" as const, text: e.reason },
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

  useEffect(
    () => () => {
      esRef.current?.close();
      if (dimTimer.current) clearTimeout(dimTimer.current);
    },
    []
  );

  // ONE cost number on screen at a time. While the run streams we add the lanes
  // up live; the moment run_done lands, its cost_usd (which also carries the
  // composer stage — a stage with no lane row) becomes the single source for
  // BOTH the header chip and the banner. They can never disagree.
  const totalCost = summary ? summary.cost : lanes.reduce((a, l) => a + l.cost, 0);
  const bookHref = `/book/${resolvedDomain ?? domain}`;

  // hues on paper: running = violet (motion) · done = green · idle = dim
  const stageTone = stage.startsWith("error")
    ? "text-error"
    : stage === "done"
    ? "text-success-text"
    : stage === "idle"
    ? "text-subtle-disabled"
    : "text-violet-link";

  const hud = (
    <>
      <span className="flex items-baseline gap-1.5 rounded-full border border-line bg-card px-3 py-1 shadow-[var(--shadow-card)]">
        <span className="font-mono text-micro uppercase tracking-[0.08em] text-subtle">stage</span>
        <span className={`metric max-w-[9rem] truncate text-caption ${stageTone}`}>{stage}</span>
      </span>
      <span className="hidden items-baseline gap-1.5 rounded-full border border-line bg-card px-3 py-1 shadow-[var(--shadow-card)] sm:flex">
        <span className="font-mono text-micro uppercase tracking-[0.08em] text-subtle">cost</span>
        <MoneyTicker value={totalCost} className="text-caption text-ink" />
      </span>
      <span className="hidden items-baseline gap-1.5 rounded-full border border-line bg-card px-3 py-1 shadow-[var(--shadow-card)] md:flex">
        <span className="font-mono text-micro uppercase tracking-[0.08em] text-subtle">time</span>
        <SecondsTicker ms={elapsed} className="text-caption text-ink" />
      </span>
    </>
  );

  return (
    <div className="page-grain min-h-screen">
      <AppHeader variant="paper" right={hud} />

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        {/* page title — same anatomy as Board / Burst / Loop */}
        <section className="reveal mb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-page">Map run</h1>
            <span className="pill bg-city-london">live</span>
            <InfoHint>
              A map run reads public pages about a vendor — its own site, the
              customer stories on it, older versions of those pages, review
              sites and job posts — and writes what it finds into the book.
            </InfoHint>
          </div>
          <p className="mt-1 text-body text-subtle">
            Name a company. Watch the evidence come in, with its cost and time.
          </p>
        </section>

        {/* command row — wraps at 390, never pans sideways */}
        <section className="reveal reveal-d1 flex flex-wrap items-end gap-3">
          <label className="well flex w-full flex-col gap-0.5 px-3.5 py-2 sm:w-60">
            <span className="font-mono text-micro uppercase tracking-[0.08em] text-subtle">
              vendor domain
            </span>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="vendor.com"
              className="metric w-full bg-transparent text-control text-ink outline-none placeholder:text-subtle-disabled"
            />
          </label>
          <label className="well flex w-full flex-col gap-0.5 px-3.5 py-2 sm:w-44">
            <span className="font-mono text-micro uppercase tracking-[0.08em] text-subtle">
              vendor name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vendor"
              className="w-full bg-transparent text-control text-ink outline-none placeholder:text-subtle-disabled"
            />
          </label>
          <button
            onClick={() => start()}
            disabled={running || !domain}
            aria-pressed={running && mode === "live"}
            className={`shrink-0 whitespace-nowrap rounded-md bg-ink px-5 py-2.5 text-control font-semibold text-white transition-all duration-150 hover:bg-ink-hover active:translate-y-px active:bg-ink-active ${
              running && mode === "live"
                ? "translate-y-px !bg-city-barcelona !text-ink !opacity-100"
                : "disabled:opacity-40"
            }`}
          >
            {running && mode === "live" ? "mapping…" : "map this vendor"}
          </button>
          <button
            onClick={() => start(true)}
            disabled={running || !domain}
            aria-pressed={running && mode === "replay"}
            className={`shrink-0 whitespace-nowrap rounded-md border px-4 py-2.5 text-control transition-colors duration-150 active:translate-y-px ${
              running && mode === "replay"
                ? "translate-y-px border-city-barcelona bg-city-barcelona/20 text-ink !opacity-100"
                : "border-line-strong bg-card text-subtle hover:border-violet-link hover:text-violet-link disabled:opacity-40"
            }`}
          >
            {running && mode === "replay" ? "replaying…" : "replay last run"}
          </button>
          {summary && (
            <Link
              href={bookHref}
              className="reveal shrink-0 whitespace-nowrap rounded-md border border-violet-200 bg-violet-50 px-5 py-2.5 text-control font-medium !text-violet-link no-underline transition-all duration-150 hover:border-violet-400 active:translate-y-px"
            >
              open the book →
            </Link>
          )}
          <span className="ml-auto pb-3">
            <InfoHint align="right">
              A map run reads public pages about a vendor — its own site, the
              customer stories on it, older versions of those pages, review sites
              and job posts — and writes what it finds into the book. Each lane
              shows what it found, what it cost and how long it took. Replay
              re-streams the last run from its journal: no new requests, no cost.
            </InfoHint>
          </span>
        </section>

        {/* stage rail */}
        <div className="reveal reveal-d1 mt-5">
          <StageFlow stage={stage} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* lane board */}
          <section className="reveal reveal-d2 min-w-0">
            <div className="mb-2.5 flex items-center gap-2">
              <span className="eyebrow">Lanes</span>
              <InfoHint>
                A lane is one place we look: the vendor&apos;s own pages, older
                versions of them, review sites, job posts. They run side by side,
                and each one reports what it found, what it cost and how long it
                took.
              </InfoHint>
            </div>
            {/* `dimming` blanks the board for a beat so a replay visibly rewinds */}
            <LaneBoard lanes={lanes} idle={stage === "idle" || dimming} />
            {summary && (
              <SummaryBanner
                candidates={summary.candidates}
                orgs={summary.orgs}
                excluded={summary.excluded}
                cost={summary.cost}
                ms={summary.ms}
                bookHref={bookHref}
              />
            )}
          </section>

          {/* evidence feed */}
          <section className="reveal reveal-d3 min-w-0">
            <EvidenceFeed feed={feed} idle={stage === "idle"} />
          </section>
        </div>
      </main>
    </div>
  );
}
