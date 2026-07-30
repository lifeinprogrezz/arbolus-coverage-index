import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Per-vendor conversion page (design §3.2, activation loop stage 1) — the
// DESTINATION every invite links to ({{conversion_page}} in the drafts).
// Contributor-facing voice, practitioner language, never the investor brand.
// [PROTOTYPE] — the form is a mock; no data is collected.

export default async function JoinPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: rawDomain } = await params;
  const domain = decodeURIComponent(rawDomain)
    .replace(/^https?:?\/*/, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  const supa = db();
  const { data: vendor } = await supa
    .from("vendors")
    .select("name, domain, book_state")
    .eq("domain", domain)
    .maybeSingle();
  if (!vendor) notFound();

  const seeds = (vendor.book_state as { seeds?: number } | null)?.seeds ?? 0;
  const bounty = seeds >= 8 ? 25 : seeds >= 3 ? 50 : 75;

  return (
    <div className="page-grain flex min-h-screen flex-col">
      <header className="glass">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-[5px] bg-violet-400 font-mono text-xs font-bold text-white">
              A
            </span>
            <span className="text-sm font-semibold">Rewards Programme</span>
          </div>
          <span className="pill bg-city-sanjose">prototype — no data collected</span>
        </div>
      </header>

      <main className="relative z-[1] mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="text-2xl leading-snug text-ink">
          You&rsquo;ve used <span className="text-violet-link">{vendor.name}</span> at
          work. That experience is worth money.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-subtle-deep">
          Investors and consultants researching {vendor.name} need to hear from real
          users — not marketing. Your first {vendor.name} review earns a one-time bounty,
          on top of the programme&rsquo;s ongoing per-read earnings.
        </p>

        <div className="mt-6 rounded-lg border border-violet-200 bg-violet-50 p-5 shadow-[var(--shadow-glow-violet)]">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-ink">First {vendor.name} review</span>
            <span className="metric text-2xl text-violet-link">${bounty}</span>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-subtle-deep">
            <li>· about 15 minutes, guided questions</li>
            <li>· paid on completion, within 14 days — no minimum-payout floor on this one</li>
            <li>· verified with your work email; your employer is never contacted</li>
          </ul>
        </div>

        {/* mock verification step */}
        <div className="mt-6 rounded-md border border-line bg-card p-5 shadow-[var(--shadow-card)]">
          <label className="text-sm font-medium text-ink">
            Verify with your work email
          </label>
          <div className="mt-2 flex gap-2">
            <input
              disabled
              placeholder="you@yourcompany.com"
              className="metric w-full rounded-md border border-line-strong px-3 py-2 text-sm"
            />
            <button
              disabled
              className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-medium text-white opacity-50"
            >
              verify
            </button>
          </div>
          <p className="provenance mt-2">
            [PROTOTYPE] — mock form. Production = their existing Persona verification
            flow; vendor employees are rejected automatically, with the reason stored.
          </p>
        </div>

        {/* what happens next */}
        <ol className="mt-6 flex flex-col gap-2 text-sm text-subtle-deep">
          <li>
            <span className="metric text-violet-link">1</span> · Review {vendor.name} —
            your ${bounty} bounty pays on completion
          </li>
          <li>
            <span className="metric text-violet-link">2</span> · Review ~4 more tools you
            use daily to unlock ongoing rewards ($1–5 every time a client reads you)
          </li>
          <li>
            <span className="metric text-violet-link">3</span> · Invite colleagues who
            use the same stack — you earn when their reviews complete
          </li>
        </ol>

        <p className="provenance mt-8">
          Why you&rsquo;re seeing this: your role appears in public material about{" "}
          {vendor.name} (a case study, a public profile, or a professional forum). We
          never post in communities and never contact anyone who opts out — one click,
          permanent. <Link href="/loop">How this engine works ↗</Link>
        </p>
      </main>
    </div>
  );
}
