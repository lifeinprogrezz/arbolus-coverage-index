import InfoHint from "@/components/ui/info-hint";

// The [ASSUMPTION] contract label, restructured (8-02): one warn tag marks
// each SECTION that contains invented rates; every rate keeps its own
// InfoHint carrying the assumption text. Once per section, not per line.

export function AssumeTag({ label = "assumptions" }: { label?: string }) {
  return (
    <span className="rounded-full border border-warn-border bg-warn-bg px-1.5 py-px font-mono text-micro uppercase tracking-[0.05em] text-warn-text">
      {label}
    </span>
  );
}

export default function Assume({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="inline-flex items-center align-middle">
      <InfoHint align={align}>{children}</InfoHint>
    </span>
  );
}
