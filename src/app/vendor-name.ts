// Vendor names arrive from the index lowercased ("arbolus", "uniswap").
// Title-case them at RENDER time only — the stored value and every domain
// stay exactly as they are. Names that already carry capitals are untouched,
// so "PeerSpot"-style casing survives.

export function vendorName(name: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (!n || n !== n.toLowerCase()) return n;
  return n
    .split(/(\s+)/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
