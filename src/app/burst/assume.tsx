import InfoHint from "@/components/ui/info-hint";

// The [ASSUMPTION] contract label: the tag stays visible as a tiny warn pill
// (progressive-disclosure law — labels visible, explanations on click); the
// assumption text itself opens in the InfoHint.

export default function Assume({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="rounded-full border border-warn-border bg-warn-bg px-1.5 py-px font-mono text-micro uppercase tracking-[0.05em] text-warn-text">
        assumption
      </span>
      <InfoHint align={align}>{children}</InfoHint>
    </span>
  );
}
