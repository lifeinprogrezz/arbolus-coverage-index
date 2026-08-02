import Link from "next/link";

// The tour rail: a quiet "next chapter" card at the end of each surface,
// following the narrative order board → run → book → burst → loop → reference.
// The prototype walks its reviewer through itself.

export default function NextSurface({
  href,
  title,
  line,
}: {
  href: string;
  title: string;
  line: string;
}) {
  return (
    <div className="mt-14 flex justify-end">
      <Link
        href={href}
        className="group pane pane-lift flex max-w-md items-center gap-5 px-5 py-4 no-underline"
      >
        <span className="font-mono text-caption uppercase tracking-[0.08em] text-subtle">
          next
        </span>
        <span className="min-w-0">
          <span className="block text-title text-ink">{title}</span>
          <span className="block text-dense text-subtle-deep">{line}</span>
        </span>
        <span
          aria-hidden
          className="text-violet-link transition-transform duration-150 group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>
    </div>
  );
}
