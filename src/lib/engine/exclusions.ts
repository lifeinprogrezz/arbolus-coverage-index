import type { EvidenceRow, Vendor } from "./types";

// The 8 eligibility checks (build spec §2.6). A visible pipeline stage:
// rejections are STORED WITH REASONS and rendered in the book view —
// the cheapest proof the engine understands Arbolus's eligibility rules.

export interface ExclusionVerdict {
  eligible: boolean;
  reason: string | null; // which check fired
}

// Intermediaries are third-party FIRMS (investors, consultancies, industry
// analysts) — an in-house "Financial Analyst" at the customer org is a user,
// not an intermediary, so bare "analyst" must NOT match.
const INTERMEDIARY_RE =
  /\b(investor|venture|capital|consultan(?:t|cy|ting)|industry analyst|research analyst|equity analyst|advisor|advisory|agency|reseller)\b/i;

function domainsMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().replace(/^www\./, "");
  const nb = b.toLowerCase().replace(/^www\./, "");
  return na === nb || na.endsWith("." + nb) || nb.endsWith("." + na);
}

export function checkEligibility(
  row: EvidenceRow,
  vendor: Vendor,
  flags?: { forumModerator?: boolean; githubOrgMember?: boolean; vendorEventSpeaker?: boolean }
): ExclusionVerdict {
  const p = row.person;
  if (!p) return { eligible: true, reason: null };

  // 1. employer-domain == vendor domain (vendor's own staff are not customers)
  if (domainsMatch(p.employer_domain, vendor.domain))
    return { eligible: false, reason: "vendor_employee: employer domain matches vendor" };

  // 2. subsidiary / parent match (exclusion_domains carries the entity graph)
  for (const ex of vendor.exclusion_domains) {
    if (domainsMatch(p.employer_domain, ex))
      return { eligible: false, reason: `vendor_entity: employer in exclusion graph (${ex})` };
  }

  // 3. GitHub org membership (verification-source only — never outreach)
  if (flags?.githubOrgMember)
    return { eligible: false, reason: "github_org_member: member of vendor GitHub org" };

  // 4. forum admin/moderator flag
  if (flags?.forumModerator)
    return { eligible: false, reason: "forum_moderator: vendor community staff/moderator" };

  // 5. email domain match (post contact-resolution re-check)
  // applied again at resolution time; here we only have employer_domain

  // 6. speaker at vendor-hosted event
  if (flags?.vendorEventSpeaker)
    return { eligible: false, reason: "vendor_event_speaker: speaker at vendor-hosted event" };

  // 7. competitor-vendor employee (not customers either)
  for (const comp of vendor.competitor_set) {
    const compDomain = comp.includes(".") ? comp : undefined;
    if (compDomain && domainsMatch(p.employer_domain, compDomain))
      return { eligible: false, reason: `competitor_employee: works at rival (${comp})` };
    if (p.employer && p.employer.toLowerCase() === comp.toLowerCase())
      return { eligible: false, reason: `competitor_employee: works at rival (${comp})` };
  }

  // 8. intermediary (investor / consultancy / analyst — not first-hand customers)
  if (p.title && INTERMEDIARY_RE.test(p.title))
    return { eligible: false, reason: `intermediary: title suggests non-customer (${p.title})` };

  return { eligible: true, reason: null };
}

// email-domain re-check used by the contact-resolution stage (check 5)
export function emailDomainExcluded(email: string, vendor: Vendor): string | null {
  const dom = email.split("@")[1]?.toLowerCase();
  if (!dom) return null;
  if (domainsMatch(dom, vendor.domain)) return "email_domain: vendor domain address";
  for (const ex of vendor.exclusion_domains) {
    if (domainsMatch(dom, ex)) return `email_domain: exclusion graph (${ex})`;
  }
  return null;
}
