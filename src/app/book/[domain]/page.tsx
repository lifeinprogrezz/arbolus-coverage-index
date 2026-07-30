import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { channelMask, CHANNEL_STATE_PILL } from "@/lib/channel-mask";
import BookTable, { type CandidateItem } from "./book-table";

export const dynamic = "force-dynamic";

// Book view (build spec §7.3) — candidates under the masking contract,
// exclusions with reasons, the reservoir panel (synthetic base, real join),
// and the per-vendor channel-legality mask.

export default async function BookPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const supa = db();

  const { data: vendor } = await supa
    .from("vendors")
    .select("*")
    .eq("domain", decodeURIComponent(domain))
    .maybeSingle();
  if (!vendor) notFound();

  const [{ data: candidates }, { data: orgs }] = await Promise.all([
    supa
      .from("candidates")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("confidence", { ascending: false, nullsFirst: false }),
    supa
      .from("customer_orgs")
      .select("org_name, org_domain, status")
      .eq("vendor_id", vendor.id),
  ]);

  // reservoir join — org-level: index says org X uses the vendor ×
  // experts employed at org X. Synthetic base, REAL join logic.
  const domains = [...new Set((orgs ?? []).map((o) => o.org_domain).filter(Boolean))];
  const { data: reservoirHits } = domains.length
    ? await supa
        .from("reservoir_experts")
        .select("title, employer, employer_domain, declared_stack, dormant, synthetic")
        .in("employer_domain", domains as string[])
    : { data: [] };

  const mask = channelMask(vendor.hq_country);
  const churned = (orgs ?? []).filter((o) => o.status === "churned");

  return (
    <div className="page-grain min-h-screen">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold !text-ink no-underline">
              Coverage Index
            </Link>
            <span className="pill bg-city-barcelona">book</span>
            <span className="font-medium">{vendor.name}</span>
            <span className="provenance">{vendor.domain}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/coverage" className="text-sm">
              ← board
            </Link>
            <Link
              href="/run"
              className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium !text-white no-underline hover:bg-ink-hover"
            >
              re-map
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <BookTable candidates={(candidates ?? []) as CandidateItem[]} />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* reservoir panel */}
          <section className="rounded-lg border border-violet-100 bg-violet-50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Reservoir join</h2>
              <span className="pill bg-city-sanjose">synthetic base · real join</span>
            </div>
            <p className="mt-1 text-sm text-subtle-deep">
              &ldquo;Which of our experts work at an org the index says uses{" "}
              {vendor.name}?&rdquo; — already verified, already paid, zero acquisition
              cost. The measured hit-ratio on the real 200k base is the experiment&rsquo;s
              first falsifiable claim.
            </p>
            <div className="metric mt-3 text-2xl text-violet-link">
              {(reservoirHits ?? []).length} hits
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {(reservoirHits ?? []).slice(0, 6).map((r, i) => (
                <div key={i} className="provenance">
                  {r.title} @ {r.employer}
                  {r.dormant ? " · dormant (reactivation loop)" : ""}
                </div>
              ))}
            </div>
          </section>

          {/* channel-legality mask */}
          <section className="rounded-lg border border-line bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Channel mask</h2>
              <span className="provenance">
                hq: {vendor.hq_country ?? "unknown — defaults shown"}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {mask.map((r) => (
                <div key={r.channel} className="flex items-start gap-2">
                  <span className={`pill mt-0.5 shrink-0 ${CHANNEL_STATE_PILL[r.state]}`}>
                    {r.state.replace("_", "-")}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-ink">{r.channel}</span>
                    <span className="ml-2 text-xs text-subtle">{r.why}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* churn candidates */}
        {churned.length > 0 && (
          <section className="mt-6 rounded-md border border-line bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-ink">
              Churn candidates{" "}
              <span className="metric text-sm text-subtle">({churned.length})</span>
            </h2>
            <p className="mt-1 text-sm text-subtle">
              Customer pages that existed historically and vanished from the live site
              (Wayback diff) — flagged as candidates, not facts; premium interview
              targets (renewal intent, switching factors).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {churned.map((o) => (
                <span key={o.org_name} className="pill bg-city-newdelhi">
                  {o.org_name}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
