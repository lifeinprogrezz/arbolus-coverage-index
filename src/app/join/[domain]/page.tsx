import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import CoLogo from "@/components/ui/co-logo";
import InfoHint from "@/components/ui/info-hint";
import { vendorName } from "../../vendor-name";

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
  const name = vendorName(vendor.name);

  const steps: { lead: string; sub: string }[] = [
    {
      lead: `Review ${name}`,
      sub: `Your $${bounty} pays out when you finish, within 14 days.`,
    },
    {
      lead: "Review 4 more tools you use",
      sub: "That unlocks $1–5 every time a client reads one of your reviews.",
    },
    {
      lead: "Invite colleagues who use the same tools",
      sub: "You earn when their reviews are done.",
    },
  ];

  return (
    <div className="page-grain flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/Arbolus-icon-violet-on-white.png"
              alt="Arbolus"
              width={24}
              height={24}
              priority
              className="h-6 w-6"
            />
            <span className="text-control font-semibold text-ink">
              Rewards Programme
            </span>
          </div>
          <span className="pill bg-city-sanjose">prototype</span>
        </div>
      </header>

      <main className="relative z-[1] mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        {/* hero */}
        <div className="reveal">
          <div className="flex items-center gap-2.5">
            <CoLogo name={vendor.name} domain={vendor.domain} size={40} />
            <div>
              <span className="block text-title text-ink">{name}</span>
              <span className="provenance">{vendor.domain}</span>
            </div>
          </div>
          <h1 className="mt-5 text-balance text-page leading-snug text-ink md:text-display">
            You&rsquo;ve used <span className="text-violet-link">{name}</span> at
            work. That experience is worth money.
          </h1>
          <p className="mt-3 max-w-lg text-pretty text-body text-subtle-deep">
            Investors researching {name} pay to hear from people who actually ran
            it.
          </p>
        </div>

        {/* offer — a voucher, not a pricing card */}
        <div className="pane reveal reveal-d1 mt-7 overflow-hidden">
          <div className="flex items-stretch">
            <div className="flex-1 px-5 py-4">
              <span className="eyebrow">your first {name} review</span>
              <p className="mt-1.5 text-body font-medium text-ink">
                15 minutes, guided questions.
              </p>
              <p className="mt-0.5 text-dense text-subtle-deep">
                No minimum payout on this one.
              </p>
            </div>
            <div className="flex flex-col items-center justify-center border-l border-dashed border-ink-25/40 bg-violet-50/50 px-7 py-4">
              <span className="metric text-[32px] leading-none text-violet-link">
                ${bounty}
              </span>
              <span className="provenance mt-1.5 whitespace-nowrap">
                known before you start
              </span>
            </div>
          </div>
          <p className="border-t border-line px-5 py-2.5 text-dense text-subtle-deep">
            Verified by work email — your employer is never contacted.
          </p>
        </div>

        {/* three steps — 24px violet-50 dots on a connecting hairline */}
        <ol className="reveal reveal-d2 relative mt-9 flex flex-col gap-6">
          <span
            aria-hidden
            className="absolute bottom-4 left-[11px] top-3 w-px bg-line"
          />
          {steps.map((s, i) => (
            <li key={s.lead} className="relative flex items-start gap-4">
              <span className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 font-mono text-caption text-violet-link ring-1 ring-violet-200">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-body font-medium text-ink">{s.lead}</p>
                <p className="mt-0.5 text-dense text-subtle-deep">{s.sub}</p>
                {i === 2 && (
                  <div className="mt-3 max-w-sm">
                    <div className="flex gap-2">
                      <div className="well flex-1">
                        <input
                          disabled
                          placeholder="colleague@their-work-email.com"
                          aria-label="Colleague's work email"
                          className="metric w-full bg-transparent px-3 py-1.5 text-dense text-ink outline-none placeholder:text-subtle-disabled"
                        />
                      </div>
                      <button
                        disabled
                        className="shrink-0 cursor-not-allowed rounded-[10px] bg-ink px-3.5 py-1.5 text-dense font-medium text-white opacity-50"
                      >
                        Invite
                      </button>
                    </div>
                    <p className="provenance mt-1.5">
                      appears in your rewards dashboard after your first review
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* mock verification */}
        <div className="pane reveal reveal-d3 mt-9 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-control font-medium text-ink">
              Verify with your work email
            </span>
            <span className="flex items-center gap-2">
              <span className="pill bg-city-sanjose">prototype</span>
              <InfoHint align="right">
                This form is a mock: nothing is sent and nothing is collected. The
                real version uses Arbolus&rsquo;s existing Persona check. People who
                work at the vendor are turned down automatically, and the reason is
                kept.
              </InfoHint>
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="well flex-1">
              <input
                disabled
                placeholder="you@yourcompany.com"
                aria-label="Work email"
                className="metric w-full bg-transparent px-3 py-2 text-control text-ink outline-none placeholder:text-subtle-disabled"
              />
            </div>
            <button
              disabled
              className="shrink-0 cursor-not-allowed rounded-[10px] bg-ink px-4 py-2 text-control font-medium text-white opacity-50"
            >
              Verify
            </button>
          </div>
        </div>

        {/* provenance */}
        <div className="reveal reveal-d4 mt-9 flex flex-wrap items-center gap-4">
          <InfoHint label="Why am I seeing this?">
            Your role shows up in public material about {name}: a case study, a
            public profile, or a professional forum. We never post in communities,
            and anyone who opts out is never contacted again. One click, and it
            is permanent.
          </InfoHint>
          <Link href="/loop" className="text-caption">
            How this works ↗
          </Link>
        </div>
      </main>
    </div>
  );
}
