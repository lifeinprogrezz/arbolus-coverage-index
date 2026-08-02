# Coverage Index

Working prototype for the Arbolus Senior Product Manager (Growth) case study — built in 3 days with AI tooling, as the brief encourages.

**Live:** https://arbolus-coverage-index.vercel.app

![Map run — lanes streaming, identities masked at the API layer](docs/screens/map-run-replay.jpg)
![Coverage board — book depth, map queue, learning loop](docs/screens/coverage-board.jpg)

## The thesis

The index is built **ahead of demand** from public evidence, with provenance and eligibility rules — so when a client opens an uncovered company and the 30-day clock starts, the trigger looks up a **warm book** instead of starting a cold search. One machine, two triggers: the continuous crawl plus activation loops are Challenge 1; the on-demand burst served from the index is Challenge 2.

## What runs live vs what is simulated

| Live (real public data) | Simulated (labelled in the UI) |
|---|---|
| 11-lane map run: 7 live in every run (sitemap harvest, customer pages, Wayback churn diff, logo-wall diff, ATS job-post sweep, PeerSpot, SERP long-tail) + 3 nightly local (community, EU TED procurement, GitHub verify-only) + the classify step | The demand trigger (their API has no write path — probe-verified) |
| Claude classification — the engine's only AI step: persona class, 4-part confidence decomposition | Arbolus-internal coverage counts |
| The 8 eligibility checks, rejections stored with reasons | The 200k expert base (synthetic — the **in-network join logic is real**) |
| Per-lane cost + latency journaling, the learning loop's budget reallocation | Invite sends (drafted per candidate, never sent — `sent=false` is never flipped) |

## Surfaces

- `/coverage` — the index at a glance: book depth per vendor, the demand-ranked map queue, the learning loop
- `/run` — the map run, streaming live over SSE, with cost and time on the ticker
- `/book/[domain]` — the output: candidates under a masking contract (one unmask toggle), evidence with provenance, per-person reach and the composer's invite draft, exclusions with reasons, the contact-legality panel
- `/burst` — the 30-day clock: trigger branch from the real book state, the walk-to-20 with every assumption labelled and priced live, cost vs the manual baseline
- `/loop` — the head-vs-tail curve, the activation loops, and the one scoped offer change
- `/join/[domain]` — the contributor-facing conversion page every invite links to
- `/reference` — the data dictionary: every column, every formula, every threshold

## Stack

Next.js (App Router) + Supabase + Claude API on Vercel. Identities in rendered output are masked server-side by default; evidence provenance is stored in full. AI runs acquisition, matching and verification — it never authors contributor content.

## Run it

```bash
npm i
cp .env.example .env.local   # fill in keys
npm run dev
```

Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`; optional: `SERPER_API_KEY` (the serp lane reports itself dark without it), `JINA_API_KEY`, `GATE_PASSWORD`.
