import Anthropic from "@anthropic-ai/sdk";
import type { EvidenceRow } from "./types";

// The engine's ONE LLM surface (build spec §2 step 9): multilingual evidence
// extraction + persona classification + confidence decomposition.
// AI runs acquisition/matching/verification; it NEVER authors contributor
// content — that boundary is Arbolus's own compliance rule, kept on purpose.

const MODEL = process.env.CLASSIFY_MODEL ?? "claude-haiku-4-5";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export interface ExtractionInput {
  vendorName: string;
  vendorDomain: string;
  competitorSet: string[];
  sourceUrl: string;
  sourceKind: string; // e.g. "vendor case-study page", "job post", "review"
  text: string; // fetched page text (markdown/plain)
}

export interface ClassifiedEvidence extends EvidenceRow {
  persona_class?: 1 | 2 | 3 | 4;
  confidence?: number;
  confidence_parts?: Record<string, number>;
}

const SYSTEM = `You extract structured customer evidence for a B2B software coverage index.
Given a fetched public page, identify organizations and named individuals that demonstrably
USE (or used, or evaluated) the target vendor's product.

Persona classes:
1 = current customer (uses it now at their employer)
2 = churned customer (used it, switched away)
3 = past user (used it at a PREVIOUS employer)
4 = evaluator who chose a rival

Rules:
- Vendor's own employees and competitor-vendor employees are NOT customers: skip them.
- Evidence must be first-hand usage signals, never speculation.
- Quote must be a verbatim fragment from the page (max 200 chars).
- evidence_date: extract if present (page dates, "since 2023", post dates), else omit.
- confidence_parts: score 0-1 each for source_authority (how authoritative the surface is),
  evidence_directness (explicit usage vs implication), recency (fresh vs stale),
  identity_specificity (named person+title vs logo only).
- confidence = weighted mean you compute from the parts.
- Works on pages in ANY language; extract to English fields but keep quotes verbatim.
Respond ONLY with JSON: {"rows": [...]} matching the provided schema. No prose.`;

export async function classifyPage(
  input: ExtractionInput
): Promise<ClassifiedEvidence[]> {
  const prompt = `Vendor: ${input.vendorName} (${input.vendorDomain})
Known competitors: ${input.competitorSet.join(", ") || "unknown"}
Source: ${input.sourceKind} — ${input.sourceUrl}

Page content (truncated):
"""
${input.text.slice(0, 24_000)}
"""

Extract rows as JSON:
{"rows":[{"org_name":str,"org_domain":str?,"evidence_type":"logo|case_study|job_post|forum|press|review_site|serp|procurement_award","evidence_url":str,"evidence_date":"YYYY-MM-DD"?,"evidence_quote":str,"status":"current|churned|evaluator","persona_class":1|2|3|4?,"person":{"full_name":str,"title":str?,"employer":str?,"employer_domain":str?,"role_signal":"decision_maker|user"}?,"confidence":0-1,"confidence_parts":{"source_authority":0-1,"evidence_directness":0-1,"recency":0-1,"identity_specificity":0-1}}]}`;

  const msg = await client().messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    const jsonStart = text.indexOf("{");
    const parsed = JSON.parse(text.slice(jsonStart));
    const rows: ClassifiedEvidence[] = (parsed.rows ?? []).map(
      (r: ClassifiedEvidence) => ({
        ...r,
        evidence_url: r.evidence_url || input.sourceUrl,
      })
    );
    return rows;
  } catch {
    return [];
  }
}

// Token cost estimate for the journal ticker (haiku-class pricing, order of magnitude)
export function estimateClassifyCost(chars: number): number {
  const inputTokens = chars / 4 + 600;
  const outputTokens = 800;
  return (inputTokens * 1e-6 + outputTokens * 5e-6) * 1.0;
}
