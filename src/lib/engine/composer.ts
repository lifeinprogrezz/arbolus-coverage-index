import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import type { Vendor } from "./types";

// The composer (design §3.1 agent 7): evidence-anchored invite + compliance
// wrapper. Drafts land in outreach_drafts with sent=false — the prototype
// NEVER sends. AI drafts Arbolus's own acquisition copy here; it never
// authors contributor content.

const MODEL = process.env.CLASSIFY_MODEL ?? "claude-haiku-4-5";
const DRAFT_CAP = 6; // per run

interface DraftCandidate {
  id: string;
  full_name: string;
  title: string | null;
  employer: string | null;
  persona_class: number | null;
  evidence: { url?: string; type?: string; quote?: string; source_domain?: string; date?: string }[];
}

const SYSTEM = `You draft first-touch invite emails for Arbolus's Customer Library
Rewards Programme, sent by Arbolus (never impersonating anyone).

Rules, all mandatory:
- Anchor on the candidate's PUBLIC evidence in one natural sentence (e.g. "your case
  study with {vendor} on {source}") — never creepy, never quote private data.
- The offer: first review of {vendor} carries a named flat bounty ($25–50 band, exact
  amount "$"+the amount you are given), paid on completion within 14 days, ~15 minutes
  of effort. State all three numbers.
- One link placeholder: {{conversion_page}}. No other links.
- Compliance wrapper: one line explaining where their details came from (public
  {source_domain}) with a permanent opt-out sentence. Professional, GDPR
  legitimate-interest register.
- 90–130 words. Warm, specific, zero hype words ("exciting", "amazing"). No em-dashes.
- Subject line ≤8 words, concrete, no clickbait.
Respond ONLY JSON: {"drafts":[{"candidate_index":n,"subject":str,"body":str}]}`;

export async function composeDrafts(
  vendor: Vendor,
  bounty: number,
  emit: (msg: string) => void
): Promise<number> {
  const supa = db();
  const { data: cands } = await supa
    .from("candidates")
    .select("id, full_name, title, employer, persona_class, evidence")
    .eq("vendor_id", vendor.id)
    .eq("eligible", true)
    .order("confidence", { ascending: false, nullsFirst: false })
    .limit(DRAFT_CAP);

  const list = (cands ?? []) as DraftCandidate[];
  if (list.length === 0) return 0;

  const payload = list.map((c, i) => ({
    index: i,
    name: c.full_name,
    title: c.title,
    employer: c.employer,
    persona_class: c.persona_class,
    evidence: c.evidence?.[0] ?? {},
  }));

  const client = new Anthropic();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Vendor: ${vendor.name} (${vendor.domain}). Bounty for this vendor: $${bounty}.
Candidates (draft one email each):
${JSON.stringify(payload, null, 1)}`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  let drafts: { candidate_index: number; subject: string; body: string }[] = [];
  try {
    const s = text.indexOf("{");
    const e = text.lastIndexOf("}");
    drafts = JSON.parse(text.slice(s, e + 1)).drafts ?? [];
  } catch {
    return 0;
  }

  let written = 0;
  for (const d of drafts) {
    const cand = list[d.candidate_index];
    if (!cand) continue;
    // refresh per run: one live draft per candidate
    await supa.from("outreach_drafts").delete().eq("candidate_id", cand.id);
    const { error } = await supa.from("outreach_drafts").insert({
      candidate_id: cand.id,
      channel: "email",
      subject: d.subject,
      body: d.body,
      sent: false,
    });
    if (!error) written++;
  }
  emit(`${written} invite drafts written (sent: never)`);
  return written;
}
