// Masking contract (build spec §1.3): STORE the full {url, quote, name};
// RENDER only {evidence_type · source domain · evidence_date · name-redacted
// quote} with "Candidate #N" identities. Full URL + name live behind the ONE
// unmask toggle — real people from public evidence, demoed responsibly.

export function candidateLabel(index: number): string {
  return `Candidate #${index + 1}`;
}

// Redact every token of the person's name from a quote, keeping readability.
export function redactQuote(quote: string | null | undefined, fullName?: string | null): string {
  if (!quote) return "";
  if (!fullName) return quote;
  let out = quote;
  for (const token of fullName.split(/\s+/).filter((t) => t.length > 2)) {
    out = out.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "[NAME]");
  }
  return out.replace(/(\[NAME\]\s*)+/g, "[NAME] ");
}

export function sourceDomain(url: string | null | undefined): string {
  if (!url) return "—";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "—";
  }
}

// first-initial + last-name @ employer domain — the cheapest resolution rung
export function patternGuess(fullName: string, domain: string, unmasked: boolean): string {
  const parts = fullName.trim().toLowerCase().split(/\s+/);
  const guess = `${parts[0]?.[0] ?? ""}${parts[parts.length - 1] ?? ""}`;
  if (!unmasked)
    return `${guess[0] ?? "•"}${"•".repeat(Math.max(guess.length - 1, 2))}@${domain}`;
  return `${guess}@${domain}`;
}

export const PERSONA_LABEL: Record<number, string> = {
  1: "current customer",
  2: "churned",
  3: "past user",
  4: "evaluator → rival",
};

// city-pastel pill class per persona class (file 14 §3 semantic mapping)
export const PERSONA_PILL: Record<number, string> = {
  1: "bg-city-london",
  2: "bg-city-newdelhi",
  3: "bg-city-sanjose",
  4: "bg-city-newyork",
};
