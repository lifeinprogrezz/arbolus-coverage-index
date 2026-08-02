// The head-vs-tail curve — the whole case in one schematic. ILLUSTRATIVE:
// the power-law shape every review marketplace shows, not Arbolus data.
// The two anchors are real: head tools carry 2,000+ reviews each, and
// covered means 20. Pure server-side SVG, paper style, one series with an
// ink-wash gradient; the demand-event marker on the tail ties this curve
// to the burst's trigger.

const W = 800;
const LEFT = 8;
const RIGHT = 8;
const BASE = 196; // baseline y
const TOP = 30; // curve peak y
const SPAN = BASE - TOP;

// long-tail shape: h(0)=1 at the head, low across the tail — decay kept
// gentle enough to read as a curve, not a cliff
function h(t: number): number {
  return 0.008 / (t + 0.008);
}

function build() {
  const plotW = W - LEFT - RIGHT;
  const pts: [number, number][] = [];
  for (let i = 0; i <= 220; i++) {
    const t = i / 220;
    pts.push([LEFT + t * plotW, BASE - h(t) * SPAN]);
  }
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${(W - RIGHT).toFixed(1)} ${BASE} L${LEFT} ${BASE} Z`;
  // covered = 20 reviews vs a 2,000+ head → the threshold sits at ~1% of peak
  const hThresh = 0.045;
  const thresholdY = BASE - hThresh * SPAN;
  const tCross = 0.008 / hThresh - 0.008;
  const crossX = LEFT + tCross * plotW;
  // the demand event: a client opens a company deep in the tail
  const tEvent = 0.62;
  const eventX = LEFT + tEvent * plotW;
  const eventY = BASE - h(tEvent) * SPAN;
  return { area, line, thresholdY, crossX, eventX, eventY };
}

export default function Distribution() {
  const { area, line, thresholdY, crossX, eventX, eventY } = build();
  return (
    <svg
      viewBox={`0 0 ${W} ${BASE + 10}`}
      className="mt-3 h-auto w-full"
      role="img"
      aria-label="Illustrative distribution of reviews across companies: a small head of tools with thousands of reviews each, and a long tail of companies with none. The covered threshold of twenty reviews sits just above the tail, and a marker shows a client opening an uncovered company deep in the tail."
    >
      <defs>
        <linearGradient id="dist-wash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-violet-300)" stopOpacity="0.55" />
          <stop offset="55%" stopColor="var(--color-violet-200)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--color-violet-100)" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* the one series — ink-wash area + line */}
      <path d={area} fill="url(#dist-wash)" />
      <path
        d={line}
        className="stroke-violet-link"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* baseline */}
      <line x1={LEFT} y1={BASE} x2={W - RIGHT} y2={BASE} className="stroke-line" strokeWidth="1" />

      {/* covered = 20 threshold */}
      <line
        x1={LEFT}
        y1={thresholdY}
        x2={W - RIGHT}
        y2={thresholdY}
        className="stroke-ink-35"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <text
        x={LEFT + 96}
        y={thresholdY - 6}
        className="fill-subtle font-mono"
        fontSize="10"
        letterSpacing="0.06em"
      >
        COVERED = 20 REVIEWS
      </text>

      {/* head/tail boundary tick */}
      <line
        x1={crossX}
        y1={thresholdY}
        x2={crossX}
        y2={BASE}
        className="stroke-ink-35"
        strokeWidth="1"
        strokeDasharray="2 3"
      />

      {/* head annotation */}
      <text x={crossX + 18} y={TOP + 14} className="fill-ink" fontSize="13" fontWeight="500">
        the head — a few tools, 2,000+ reviews each
      </text>
      <text x={crossX + 18} y={TOP + 32} className="fill-subtle" fontSize="12">
        today&rsquo;s loops feed here: views live here, so the royalty pays here
      </text>

      {/* tail annotation */}
      <text x={W * 0.42} y={BASE - 78} className="fill-ink" fontSize="13" fontWeight="500">
        the tail — most of 20,000 companies at zero
      </text>
      <text x={W * 0.42} y={BASE - 60} className="fill-subtle" fontSize="12">
        the index aims every loop here
      </text>

      {/* the demand event on the tail — the burst's trigger, drawn */}
      <line
        x1={eventX}
        y1={eventY - 4}
        x2={eventX}
        y2={eventY - 26}
        className="stroke-violet-link"
        strokeWidth="1"
      />
      <circle
        cx={eventX}
        cy={eventY}
        r="4.5"
        className="fill-card stroke-violet-link"
        strokeWidth="2"
      />
      <circle cx={eventX} cy={eventY} r="9" className="stroke-violet-300" strokeWidth="1" fill="none" opacity="0.6" />
      <text
        x={eventX}
        y={eventY - 34}
        textAnchor="middle"
        className="fill-violet-link font-mono"
        fontSize="10"
        letterSpacing="0.06em"
      >
        A CLIENT OPENS A COMPANY HERE → THE BURST FIRES
      </text>

    </svg>
  );
}
