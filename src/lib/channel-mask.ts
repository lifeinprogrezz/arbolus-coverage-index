// Channel-legality mask (build spec §2.8): ONE rules table driven by
// hq_country, rendered per vendor. The geography hole becomes a stated
// compliance rule, never a silent skip.

export interface ChannelRule {
  channel: string;
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
    { channel: "sitemap / wayback / serp", state: "open", why: "geography-neutral lanes; multilingual extraction, localized query templates" },
    { channel: "ats sweep", state: liOk || optIn ? "open" : "locked", why: "Anglo-locked boards today — JP=HERP, BR=Gupy, IN=Naukri as production extensions" },
    { channel: "eu ted procurement", state: ["", "EU", "ES", "DE", "FR", "NL", "SE", "IT", "PT", "IE", "DK", "FI", "PL", "AT", "BE"].includes(c) ? "open" : "locked", why: "EU-only register; national procurement registers elsewhere" },
    {
      channel: "direct email",
      state: optIn ? "consent_first" : liOk ? "open" : "counsel",
      why: optIn
        ? "opt-in regime (CASL / JP specified-email act) — consent-first capture is PRIMARY here"
        : liOk
        ? "legitimate interest + layered Art.14 notice + permanent opt-out"
        : "regime unresearched (LGPD/DPDP) — flagged for local counsel, stated not guessed",
    },
    { channel: "community placement", state: "open", why: "per-community human-BD one-off, amortized; identify in vendor forums, never solicit there" },
    { channel: "physical mail", state: "open", why: "no consent gate in EU/UK (ePrivacy covers electronic channels; post absent); print-API automated" },
    { channel: "cold voice", state: "locked", why: "rejected everywhere — US TCPA wall, Spain closed; voice ships only as a post-consent A/B lane" },
    { channel: "payouts", state: "open", why: "Tipalti — 196 countries already solved" },
  ];
}

export const CHANNEL_STATE_PILL: Record<ChannelRule["state"], string> = {
  open: "bg-city-london",
  locked: "bg-city-sanjose",
  consent_first: "bg-city-barcelona",
  counsel: "bg-city-newdelhi",
};
