"use client";

import { useState } from "react";
import Link from "next/link";
import { PERSONA_LABEL, PERSONA_PILL } from "@/lib/mask";

// Presentational half of the book view. Masking happens SERVER-SIDE
// (page.tsx): the default render's payload carries no names, quotes are
// pre-redacted, and evidence URLs are withheld. The unmask toggle is an
// explicit server round-trip (?unmask=1) — a deliberate, visible switch.

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
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink/[.06]">
          <div className="h-full rounded-full bg-violet-link" style={{ width: `${value * 100}%` }} />
        </div>
        <span className="metric text-xs">{value.toFixed(2)}</span>
      </div>
      {parts && (
        <div className="absolute left-0 top-6 z-20 hidden w-56 rounded-md border border-line bg-card p-3 shadow-[var(--shadow-raised)] group-hover:block">
          {Object.entries(parts).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-xs text-subtle">{k.replace(/_/g, " ")}</span>
              <span className="metric text-xs">{Number(v).toFixed(2)}</span>
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
  toggleHref,
}: {
  candidates: DisplayCandidate[];
  unmasked: boolean;
  toggleHref: string;
}) {
  const [open, setOpen] = useState<string | null>(null);

  const eligible = candidates.filter((c) => c.eligible);
  const excluded = candidates.filter((c) => !c.eligible);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">
          The book <span className="metric text-sm text-subtle">({eligible.length} eligible)</span>
        </h2>
        <Link
          href={toggleHref}
          className={`rounded-md border px-3 py-1.5 text-xs no-underline ${
            unmasked
              ? "border-warn-border bg-warn-bg !text-warn-text"
              : "border-line bg-card !text-ink hover:bg-ground-tint"
          }`}
        >
          {unmasked ? "masking OFF — identities visible" : "unmask identities"}
        </Link>
      </div>

      {eligible.length === 0 && (
        <div className="mb-4 rounded-lg border border-city-newdelhi/50 bg-warn-bg p-6">
          <div className="flex items-center gap-3">
            <span className="pill bg-city-sanjose">cold book</span>
            <span className="text-base font-semibold text-ink">
              No public evidence surfaced for this vendor — and that is a branch, not a failure.
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-subtle-deep">
            The burst playbook branches here: an emergency map re-runs on demand (minutes,
            pennies) · scarcity pricing raises the first-review bounty toward the $75+ tier ·
            consent-first capture and the reservoir carry more of the walk · and the clock
            honestly extends. Demand-gating means <strong>$0 was spent</strong> reaching this
            conclusion — the engine only pays where a client already asked.
          </p>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-line bg-card shadow-[var(--shadow-card)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-subtle">
              <th className="px-4 py-3">Identity</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Employer</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Signal</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3">Reservoir</th>
            </tr>
          </thead>
          <tbody>
            {eligible.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-b border-line last:border-0 hover:bg-ink/[.04]"
                onClick={() => setOpen(open === c.id ? null : c.id)}
              >
                <td className="px-4 py-3 font-medium text-ink">
                  {c.identity}
                  {open === c.id && (
                    <div className="mt-2 flex flex-col gap-1.5 font-normal">
                      {c.evidence.map((e, j) => (
                        <div key={j} className="provenance max-w-md whitespace-normal">
                          {e.type} · {e.source_domain} · {e.date ?? "undated"} — &ldquo;
                          {e.quote}&rdquo;
                          {e.url && (
                            <>
                              {" "}
                              <a href={e.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()}>
                                source ↗
                              </a>
                            </>
                          )}
                        </div>
                      ))}
                      <div className="provenance max-w-md whitespace-normal">
                        contact_state: <span className="metric">{c.contact_state}</span>
                        {c.contact_guess && (
                          <>
                            {" "}· pattern-guess: <span className="metric">{c.contact_guess}</span>
                          </>
                        )}{" "}
                        · verification = production step (NeverBounce-class API) — the state machine
                        is the argument, not the SMTP handshake
                      </div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 align-top">{c.title ?? "—"}</td>
                <td className="px-4 py-3 align-top">{c.employer ?? "—"}</td>
                <td className="px-4 py-3 align-top">
                  {c.persona_class ? (
                    <span className={`pill ${PERSONA_PILL[c.persona_class]}`}>
                      {c.persona_class} · {PERSONA_LABEL[c.persona_class]}
                    </span>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top text-xs text-subtle">{c.role_signal ?? "—"}</td>
                <td className="px-4 py-3 align-top">
                  <ConfidenceBar value={c.confidence} parts={c.confidence_parts} />
                </td>
                <td className="metric px-4 py-3 align-top text-xs">
                  {c.evidence.length} item{c.evidence.length === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3 align-top">
                  {c.reservoir_match ? (
                    <span className="pill bg-city-newyork">match</span>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {excluded.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            Excluded, with reasons{" "}
            <span className="metric text-xs text-subtle">({excluded.length})</span>
          </h3>
          <div className="flex flex-col gap-1.5">
            {excluded.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-md border border-warn-border bg-warn-bg px-3 py-2 text-sm"
              >
                <span className="font-medium">{c.identity}</span>
                <span className="text-subtle-deep">{c.title}</span>
                <span className="metric ml-auto text-xs text-warn-text">{c.exclusion_reason}</span>
              </div>
            ))}
          </div>
          <p className="provenance mt-2">
            rejections are stored, not discarded — the eligibility rules are a visible pipeline stage
          </p>
        </div>
      )}
    </div>
  );
}
