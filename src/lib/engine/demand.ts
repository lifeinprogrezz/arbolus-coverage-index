import { db } from "@/lib/db";

// The map queue (build spec §3): which vendor gets indexed next, ranked by
// demand signals. Signal weights are a transparent heuristic (per the locked
// cut order) — documented, not learned.
//
//   searched-and-empty ×3   the highest-intent signal in the building
//   funding event      ×2   diligence attention lands in months
//   watchlist          ×1   internal client target lists (indexing leaks nothing)
//   client view        ×2   a client actually opened the company
//   competitor-of-indexed ×1  cheap: the competitor set is already extracted

export interface QueueRow {
  id: string;
  name: string;
  domain: string;
  category: string | null;
  demand_score: number;
  mapped: boolean;
  signals: string[];
}

const WEIGHT: Record<string, number> = {
  searched_empty: 3,
  funding: 2,
  client_view: 2,
  watchlist: 1,
};

export async function mapQueue(): Promise<QueueRow[]> {
  const supa = db();
  const [{ data: vendors }, { data: events }] = await Promise.all([
    supa.from("vendors").select("id, name, domain, category, competitor_set, last_mapped_at, book_state"),
    supa.from("demand_events").select("vendor_id, event_type"),
  ]);

  // competitor-of-indexed: vendor names appearing in an INDEXED vendor's competitor set
  const indexedCompetitors = new Set<string>();
  for (const v of vendors ?? []) {
    if (!v.last_mapped_at) continue;
    for (const c of v.competitor_set ?? []) indexedCompetitors.add(String(c).toLowerCase());
  }

  const rows: QueueRow[] = [];
  for (const v of vendors ?? []) {
    const evs = (events ?? []).filter((e) => e.vendor_id === v.id);
    const signals: string[] = [];
    let score = 0;
    for (const e of evs) {
      score += WEIGHT[e.event_type] ?? 1;
      signals.push(e.event_type.replace("_", "-"));
    }
    if (indexedCompetitors.has(v.name.toLowerCase())) {
      score += 1;
      signals.push("competitor-of-indexed");
    }
    const seeds = (v.book_state as { seeds?: number } | null)?.seeds ?? 0;
    const mapped = Boolean(v.last_mapped_at);
    // cold mapped books with demand still queue for a re-map
    if (mapped && seeds >= 3) score = score * 0.5;
    rows.push({
      id: v.id,
      name: v.name,
      domain: v.domain,
      category: v.category,
      demand_score: score,
      mapped,
      signals: [...new Set(signals)],
    });
  }

  // persist scores so the board and burst view read the same number
  await Promise.all(
    rows.map((r) =>
      supa.from("vendors").update({ demand_score: r.demand_score }).eq("id", r.id)
    )
  );

  return rows.sort((a, b) => b.demand_score - a.demand_score);
}
