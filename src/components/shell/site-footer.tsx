import Link from "next/link";

// Shared site footer — the five Arbolus hub cities + provenance line.
// One footer on every shell page so the app reads as one system.
// (/join/[domain] deliberately omits it: that page plays the in-fiction
// vendor sign-up surface, not the prototype shell.)

const CITIES: [string, string][] = [
  ["London", "bg-city-london"],
  ["Barcelona", "bg-city-barcelona"],
  ["New York", "bg-city-newyork"],
  ["New Delhi", "bg-city-newdelhi"],
  ["San José", "bg-city-sanjose"],
];

export default function SiteFooter() {
  return (
    <footer className="reveal reveal-d3 relative z-[1] mt-auto border-t border-line-warm">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-10">
        <div className="flex flex-wrap justify-center gap-2">
          {CITIES.map(([name, bg]) => (
            <span key={name} className={`pill ${bg}`}>
              {name}
            </span>
          ))}
        </div>
        <p className="provenance text-center">
          built for the Arbolus growth case · candidate identities masked ·{" "}
          <Link href="/reference" className="text-inherit underline decoration-line underline-offset-2 hover:text-ink">
            reference
          </Link>
        </p>
      </div>
    </footer>
  );
}
