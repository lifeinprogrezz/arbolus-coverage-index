"use client";

import { Fragment, useState } from "react";
import { candidateLabel, redactQuote, sourceDomain, PERSONA_LABEL, PERSONA_PILL } from "@/lib/mask";

// Client half of the book view: the candidate table under the §1.3 masking
// contract. Identities masked by default; ONE unmask toggle reveals names +
// full URLs (real people from public evidence — we say so in the room).

export interface EvidenceItem {
  url?: string | null;
  date?: string | null;
  type?: string | null;
  quote?: string | null;
  source_domain?: string | null;
}

export interface CandidateItem {
  id: string;
  full_name: string | null;
  title: string | null;
  employer: string | null;
  persona_class: number | null;
  role_signal: string | null;
  evidence: EvidenceItem[];
  confidence: number | null;
  confidence_parts: Record<string, number> | null;
  contact_state: string;
  eligible: boolean;
  exclusion_reason: string | null;
  reservoir_match: boolean;
}

function ConfidenceBar({ value, parts }: { value: number | null; parts: Record<string, number> | null }) {
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

export default function BookTable({ candidates }: { candidates: CandidateItem[] }) {
  const [unmasked, setUnmasked] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const eligible = candidates.filter((c) => c.eligible);
  const excluded = candidates.filter((c) => !c.eligible);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">
          The book <span className="metric text-sm text-subtle">({eligible.length} eligible)</span>
        </h2>
        <button
          onClick={() => setUnmasked((u) => !u)}
          className={`rounded-md border px-3 py-1.5 text-xs ${
            unmasked
              ? "border-warn-border bg-warn-bg text-warn-text"
              : "border-line bg-card text-ink hover:bg-ground-tint"
          }`}
        >
          {unmasked ? "masking OFF — identities visible" : "unmask identities"}
        </button>
      </div>

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
            {eligible.map((c, i) => (
              <Fragment key={c.id}>
                <tr
                  className="cursor-pointer border-b border-line last:border-0 hover:bg-ink/[.04]"
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                >
                  <td className="px-4 py-3 font-medium text-ink">
                    {unmasked ? c.full_name : candidateLabel(i)}
                  </td>
                  <td className="px-4 py-3">{c.title ?? "—"}</td>
                  <td className="px-4 py-3">{c.employer ?? "—"}</td>
                  <td className="px-4 py-3">
                    {c.persona_class ? (
                      <span className={`pill ${PERSONA_PILL[c.persona_class]}`}>
                        {c.persona_class} · {PERSONA_LABEL[c.persona_class]}
                      </span>
                    ) : (
                      <span className="text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-subtle">{c.role_signal ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ConfidenceBar value={c.confidence} parts={c.confidence_parts} />
                  </td>
                  <td className="metric px-4 py-3 text-xs">{c.evidence.length} item{c.evidence.length === 1 ? "" : "s"}</td>
                  <td className="px-4 py-3">
                    {c.reservoir_match ? <span className="pill bg-city-newyork">match</span> : <span className="text-subtle">—</span>}
                  </td>
                </tr>
                {open === c.id && (
                  <tr className="border-b border-line bg-ground-tint">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {c.evidence.map((e, j) => (
                          <div key={j} className="provenance">
                            {e.type} · {e.source_domain ?? sourceDomain(e.url)} · {e.date ?? "undated"} —{" "}
                            <span className="text-ink-60">
                              &ldquo;{unmasked ? e.quote : redactQuote(e.quote, c.full_name)}&rdquo;
                            </span>
                            {unmasked && e.url && (
                              <>
                                {" "}
                                <a href={e.url} target="_blank" rel="noreferrer">
                                  source ↗
                                </a>
                              </>
                            )}
                          </div>
                        ))}
                        <div className="provenance">
                          contact_state: <span className="metric">{c.contact_state}</span> · resolution +
                          verification are production steps (named API) — the state machine is the argument
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
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink">
            Excluded, with reasons{" "}
            <span className="metric text-xs text-subtle">({excluded.length})</span>
          </h3>
          <div className="flex flex-col gap-1.5">
            {excluded.map((c, i) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-md border border-warn-border bg-warn-bg px-3 py-2 text-sm"
              >
                <span className="font-medium">{unmasked ? c.full_name : `Excluded #${i + 1}`}</span>
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
