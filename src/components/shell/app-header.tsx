"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The product's one navigation system. Glass chrome, real Arbolus wordmark
// (standard on paper, violet-white on the terminal), active-nav thumb,
// shadow lifts only after scroll (file 11 §4 AppShell law).

const NAV = [
  { href: "/coverage", label: "Board" },
  { href: "/run", label: "Map run" },
  { href: "/burst", label: "Burst" },
  { href: "/loop", label: "Loop" },
];

export default function AppHeader({
  variant = "paper",
  right,
}: {
  variant?: "paper" | "term";
  right?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = (href: string) =>
    href === "/run"
      ? pathname.startsWith("/run")
      : pathname.startsWith(href) ||
        (href === "/coverage" && pathname.startsWith("/book"));

  return (
    <header
      className={`glass sticky top-0 z-20 transition-shadow ${
        scrolled ? "shadow-[var(--shadow-page)]" : ""
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
          <Image
            src={
              variant === "term"
                ? "/brand/Arbolus-full-logo-violet-white.png"
                : "/brand/Arbolus-full-logo-standard.png"
            }
            alt="Arbolus"
            width={92}
            height={24}
            priority
            className="h-6 w-auto"
          />
          <span
            className={`mt-0.5 border-l pl-2.5 font-mono text-caption uppercase tracking-[0.08em] ${
              variant === "term"
                ? "border-term-line text-term-muted"
                : "border-line text-subtle"
            }`}
          >
            Coverage Index
          </span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 text-control no-underline transition-colors ${
                active(n.href)
                  ? `nav-thumb ${variant === "term" ? "!text-term-text" : "!text-ink"} font-medium`
                  : variant === "term"
                  ? "!text-term-muted hover:!text-term-text"
                  : "!text-subtle hover:!text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">{right}</div>
      </div>
    </header>
  );
}
