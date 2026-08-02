// Channel-legality mask (build spec §2.8): ONE rules table driven by
// hq_country, rendered per vendor. The geography hole becomes a stated
// compliance rule, never a silent skip.

export interface ChannelRule {
  channel: string;
  group: "read" | "contact" | "pay";
  origin?: "internal" | "external"; // contact rows only
  state: "open" | "locked" | "consent_first" | "counsel";
  why: string;
}

const OPT_IN_REGIMES = new Set(["CA", "JP"]); // CASL, specified-email act
const LI_EMAIL = new Set(["EU", "UK", "US", "ES", "DE", "FR", "NL", "SE", "IT", "PT", "IE", "DK", "FI", "NO", "PL", "AT", "BE", "CH", "GB"]);

export function channelMask(hqCountry: string | null): ChannelRule[] {
  const c = (hqCountry ?? "").toUpperCase();
  const optIn = OPT_IN_REGIMES.has(c);
  const liOk = c === "" || LI_EMAIL.has(c);

  return [
    { channel: "public pages + web search", group: "read", state: "open", why: "The sitemap, Wayback and search lanes read openly published pages — geography-neutral; multilingual extraction, localized query templates" },
    { channel: "job posts", group: "read", state: liOk || optIn ? "open" : "locked", why: "Public job boards naming the vendor in a stack. Anglo-locked boards today — JP=HERP, BR=Gupy, IN=Naukri as production extensions" },
    { channel: "procurement records", group: "read", state: ["", "EU", "ES", "DE", "FR", "NL", "SE", "IT", "PT", "IE", "DK", "FI", "PL", "AT", "BE"].includes(c) ? "open" : "locked", why: "TED, the EU's public register of government software purchases — EU-only; national registers elsewhere" },
    {
      channel: "warm intro via our network",
      group: "contact",
      origin: "internal",
      state: "open",
      why: "An introduction through an expert already on the platform — an existing, consented relationship, so no cold-contact law applies. Best reply rate, zero cost; the in-network matches feed it",
    },
    {
      channel: "re-engaging our own experts",
      group: "contact",
      origin: "internal",
      state: "open",
      why: "Experts already registered (including dormant ones) agreed to be contacted when they joined; the index re-prompts them when it first maps their company",
    },
    {
      channel: "direct email",
      group: "contact",
      origin: "external",
      state: optIn ? "consent_first" : liOk ? "open" : "counsel",
      why: optIn
        ? "opt-in regime (CASL / JP specified-email act) — consent-first capture is PRIMARY here"
        : liOk
        ? "legitimate interest + layered Art.14 notice + permanent opt-out"
        : "regime unresearched (LGPD/DPDP) — flagged for local counsel, stated not guessed",
    },
    { channel: "through communities", group: "contact", origin: "external", state: "open", why: "A one-off arrangement with each community's moderators, amortized; we identify people in vendor forums, never solicit there" },
    { channel: "postal mail", group: "contact", origin: "external", state: "open", why: "No consent gate in EU/UK (ePrivacy covers electronic channels; post absent); print-API automated" },
    { channel: "cold calls", group: "contact", origin: "external", state: "locked", why: "Rejected everywhere — US TCPA wall, Spain closed; voice ships only as a post-consent A/B lane" },
    { channel: "paying contributors", group: "pay", state: "open", why: "Sending bounty money: Tipalti covers 196 countries — already solved" },
  ];
}

export const CHANNEL_STATE_PILL: Record<ChannelRule["state"], string> = {
  open: "bg-city-london",
  locked: "bg-city-sanjose",
  consent_first: "bg-city-barcelona",
  counsel: "bg-city-newdelhi",
};
