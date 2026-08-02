"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import CoLogo from "@/components/ui/co-logo";
import InfoHint from "@/components/ui/info-hint";
import { PERSONA_LABEL, PERSONA_PILL } from "@/lib/mask";

// Presentational half of the book view. Masking happens SERVER-SIDE
// (page.tsx): the default render's payload carries no names, quotes are
// pre-redacted, and evidence URLs are withheld. The unmask toggle lives in
// the app header — an explicit server round-trip (?unmask=1).

export interface DisplayEvidence {
  type: string | null;
  source_domain: string;
  date: string | null;
  quote: string;
  url: string | null; // only present when unmasked
}

export interface DisplayCandidate {
  id: string;
  identity: string; // "Candidate #N" or the real name (server-decided)
  title: string | null;
  employer: string | null;
  employer_domain: string | null;
  persona_class: number | null;
  role_signal: string | null;
  evidence: DisplayEvidence[];
  confidence: number | null;
  confidence_parts: Record<string, number> | null;
  contact_state: string;
  contact_guess: string | null;
  eligible: boolean;
  exclusion_reason: string | null;
  reservoir_match: boolean;
}

// The engine stores raw enums; nothing raw reaches the screen.
const SIGNAL_LABEL: Record<string, string> = {
  decision_maker: "Decision maker",
  user: "User",
};

const EVIDENCE_LABEL: Record<string, string> = {
  case_study: "Case study",
  job_post: "Job post",
  review_site: "Review",
  logo: "Logo",
  press: "Press",
  procurement_award: "Procurement",
  forum: "Forum",
  serp: "Search result",
};

function humanize(
  raw: string | null | undefined,
  map: Record<string, string>,
  fallback: string
): string {
  if (!raw) return fallback;
  const key = raw.toLowerCase();
  if (map[key]) return map[key];
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function ConfidenceBar({
  value,
  parts,
}: {
  value: number | null;
  parts: Record<string, number> | null;
}) {
  if (value == null) return <span className="text-subtle">—</span>;
  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        <div className="dbar w-16">
          <i style={{ width: `${value * 100}%` }} />
        </div>
        <span className="metric text-dense">{value.toFixed(2)}</span>
      </div>
      {parts && (
        <div className="pane absolute left-0 top-6 z-20 hidden w-56 p-3 group-hover:block">
          {Object.entries(parts).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-dense text-subtle">{k.replace(/_/g, " ")}</span>
              <span className="metric text-dense">{Number(v).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BookTable({
  candidates,
  unmasked,
}: {
  candidates: DisplayCandidate[];
  unmasked: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [tbodyRef] = useAutoAnimate<HTMLTableSectionElement>();

  const eligible = candidates.filter((c) => c.eligible);
  const excluded = candidates.filter((c) => !c.eligible);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <h2 className="text-title">The book</h2>
        <span className="metric text-dense text-subtle">{eligible.length} eligible</span>
        {unmasked ? (
          <span className="pill border border-warn-border bg-warn-bg !text-warn-text">
            identities visible
          </span>
        ) : (
          <span className="pill bg-city-sanjose">masked</span>
        )}
        <InfoHint>
          Names never leave the server. The page you are reading carries no names,
          quotes arrive with the name taken out, and evidence links are held back.
          The unmask button in the header is the one switch that shows them. These
          are real people found in public material, so we demo them carefully.
        </InfoHint>
      </div>

      {eligible.length === 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-warn-border bg-warn-bg p-5 shadow-[var(--shadow-card)]">
          <span className="pill bg-city-sanjose">cold book</span>
          <p className="text-control text-ink">
            No public evidence turned up for this vendor. Reaching that answer cost
            $0.
          </p>
          <InfoHint>
            The 30-day playbook branches here. The first-review bounty rises toward
            the $75 tier because the people are harder to find, asking people to
            opt in and the in-network experts carry more of the work, and the clock honestly
            runs longer. An emergency map can re-run on demand in minutes, for
            pennies.
          </InfoHint>
          <Link href="/run" className="ml-auto whitespace-nowrap text-control font-medium">
            run emergency map →
          </Link>
        </div>
      )}

      <div className="pane tracker-scroll overflow-x-auto">
        <table className="w-full border-collapse text-control">
          <thead>
            <tr className="border-b border-line text-left text-dense uppercase tracking-wide text-subtle">
              <th className="px-4 py-3 font-medium">Identity</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Employer</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Signal</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
              <th className="px-4 py-3 text-right font-medium">Evidence</th>
              <th className="whitespace-nowrap py-3 pl-4 pr-5 text-center font-medium">In network</th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {eligible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-subtle">
                  0 candidates yet —{" "}
                  <Link href="/run" className="whitespace-nowrap">
                    run the map →
                  </Link>
                </td>
              </tr>
            )}
            {eligible.map((c) => (
              <Fragment key={c.id}>
                <tr
                  className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-ink/[.04]"
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                  aria-expanded={open === c.id}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">
                    <span
                      className={`mr-1.5 inline-block text-caption text-subtle transition-transform duration-150 ${
                        open === c.id ? "rotate-90" : ""
                      }`}
                      aria-hidden
                    >
                      ▸
                    </span>
                    {c.identity}
                  </td>
                  <td className="px-4 py-3">{c.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.employer ? (
                      <div className="flex items-center gap-2">
                        <CoLogo name={c.employer} domain={c.employer_domain} size={20} />
                        <span className="whitespace-nowrap">{c.employer}</span>
                      </div>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.persona_class ? (
                      <span
                        className={`pill whitespace-nowrap ${PERSONA_PILL[c.persona_class]}`}
                      >
                        {PERSONA_LABEL[c.persona_class]}
                      </span>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-dense text-subtle">
                    {humanize(c.role_signal, SIGNAL_LABEL, "—")}
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBar value={c.confidence} parts={c.confidence_parts} />
                  </td>
                  <td className="metric px-4 py-3 text-right">{c.evidence.length}</td>
                  <td className="py-3 pl-4 pr-5 text-center">
                    {c.reservoir_match ? (
                      <span className="pill bg-city-newyork">match</span>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                </tr>

                {open === c.id && (
                  <tr className="border-b border-line bg-ground-tint/50 last:border-0">
                    <td colSpan={8} className="px-5 py-4">
                      <div className="dg max-w-3xl">
                        <span className="dg-k">Evidence</span>
                        <div className="dg-v flex flex-col gap-2.5">
                          {c.evidence.map((e, j) => (
                            <div key={j}>
                              <p className="text-dense italic text-ink-70">
                                &ldquo;{e.quote}&rdquo;
                              </p>
                              <p className="provenance mt-0.5">
                                {humanize(e.type, EVIDENCE_LABEL, "Evidence")} ·{" "}
                                {e.source_domain} · {e.date ?? "undated"}
                                {e.url && (
                                  <>
                                    {" "}
                                    ·{" "}
                                    <a
                                      href={e.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(ev) => ev.stopPropagation()}
                                    >
                                      source ↗
                                    </a>
                                  </>
                                )}
                              </p>
                            </div>
                          ))}
                        </div>

                        <span className="dg-k">Contact</span>
                        <div className="dg-v flex items-center gap-1.5">
                          {c.contact_guess ? (
                            <span className="metric text-dense">{c.contact_guess}</span>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                          <InfoHint>
                            Guessed from the name plus the employer&rsquo;s domain, the
                            cheapest way to reach someone. Checking the address is real
                            is a production step; this prototype only records what stage
                            each contact has reached.
                          </InfoHint>
                        </div>

                        <span className="dg-k">Stage</span>
                        <div className="dg-v">
                          <span className="pill bg-city-sanjose">
                            {humanize(c.contact_state, {}, "—")}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {excluded.length > 0 && (
        <div className="mt-8">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="eyebrow">Ruled out</h3>
            <span className="metric text-dense text-subtle">{excluded.length}</span>
            <InfoHint>
              We keep the rejections instead of dropping them. Ruling someone out is
              a visible step in the pipeline, and every exclusion keeps its reason.
            </InfoHint>
          </div>
          <div className="flex flex-col gap-1.5">
            {excluded.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-warn-border bg-warn-bg px-3.5 py-2 text-control"
              >
                <span className="font-medium text-ink">{c.identity}</span>
                <span className="text-subtle-deep">{c.title}</span>
                <span className="metric ml-auto text-caption text-warn-text">
                  {c.exclusion_reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
