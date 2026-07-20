/**
 * Pure inline SVG + CSS-keyframes animation.
 * A wireframe PDF page is scanned by a teal beam; markdown glyphs
 * peel upward as the beam sweeps past. No libraries, no images.
 */

const GLYPHS: Array<{ char: string; x: number; y: number; delay: string }> = [
  { char: "#", x: 46, y: 78, delay: "0.05s" },
  { char: "*", x: 92, y: 92, delay: "0.15s" },
  { char: "_", x: 138, y: 74, delay: "0.30s" },
  { char: "[", x: 176, y: 102, delay: "0.42s" },
  { char: "]", x: 214, y: 88, delay: "0.55s" },
  { char: ">", x: 60, y: 122, delay: "0.70s" },
  { char: "-", x: 106, y: 134, delay: "0.85s" },
  { char: "`", x: 152, y: 118, delay: "1.0s" },
  { char: "#", x: 200, y: 138, delay: "1.15s" },
  { char: "*", x: 78, y: 156, delay: "1.30s" },
  { char: "]", x: 130, y: 170, delay: "1.45s" },
  { char: "[", x: 176, y: 158, delay: "1.6s" },
  { char: "-", x: 224, y: 172, delay: "1.75s" },
  { char: ">", x: 96, y: 188, delay: "1.9s" },
];

const ASSEMBLED_LINES: Array<{ text: string; y: number; delay: string }> = [
  { text: "## Introduction", y: 20, delay: "0.4s" },
  { text: "- structured output", y: 34, delay: "0.9s" },
  { text: "> extracted in-browser", y: 48, delay: "1.4s" },
];

export function ScannerAnimation() {
  return (
    <div className="relative mx-auto flex h-[240px] w-full max-w-md items-center justify-center">
      {/* Corner crosshairs to match dropzone continuity */}
      {[
        "left-0 top-0 border-l border-t",
        "right-0 top-0 border-r border-t",
        "left-0 bottom-0 border-l border-b",
        "right-0 bottom-0 border-r border-b",
      ].map((pos) => (
        <span
          key={pos}
          aria-hidden="true"
          className={`pointer-events-none absolute h-3 w-3 border-brand/70 ${pos}`}
        />
      ))}

      <svg
        role="img"
        aria-label="Scanning document"
        viewBox="0 0 320 220"
        width="100%"
        height="100%"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="beam-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--color-brand)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="beam-band" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0" />
            <stop offset="50%" stopColor="var(--color-brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="page-clip">
            <rect x="40" y="40" width="200" height="150" rx="3" />
          </clipPath>
        </defs>

        {/* Assembled markdown lines above the page (the "output") */}
        <g fontFamily="var(--font-mono)" fontSize="9" fill="var(--color-brand)">
          {ASSEMBLED_LINES.map((l) => (
            <text
              key={l.text}
              x={260}
              y={l.y}
              className="natymd-assemble"
              style={{ animationDelay: l.delay }}
              opacity="0"
            >
              {l.text}
            </text>
          ))}
        </g>

        {/* PDF page — wireframe */}
        <g>
          {/* dog-eared corner via path */}
          <path
            d="M40 43 Q40 40 43 40 L222 40 L240 58 L240 187 Q240 190 237 190 L43 190 Q40 190 40 187 Z"
            fill="none"
            stroke="var(--color-brand)"
            strokeOpacity="0.55"
            strokeWidth="1.2"
          />
          <path
            d="M222 40 L222 58 L240 58"
            fill="none"
            stroke="var(--color-brand)"
            strokeOpacity="0.5"
            strokeWidth="1.2"
          />
          {/* faint text-line rects */}
          {[
            { y: 68, w: 150 },
            { y: 82, w: 170 },
            { y: 96, w: 130 },
            { y: 118, w: 160 },
            { y: 132, w: 140 },
            { y: 146, w: 170 },
            { y: 168, w: 90 },
          ].map((r) => (
            <rect
              key={r.y}
              x={52}
              y={r.y}
              width={r.w}
              height={4}
              rx="1"
              fill="var(--color-border)"
              opacity="0.6"
            />
          ))}

          {/* Floating markdown glyphs — clipped to the page bounds */}
          <g
            clipPath="url(#page-clip)"
            fontFamily="var(--font-mono)"
            fontSize="12"
            fontWeight="600"
            fill="var(--color-brand)"
          >
            {GLYPHS.map((g, i) => (
              <text
                key={`${g.char}-${i}`}
                x={g.x}
                y={g.y}
                className="natymd-ascend"
                style={{ animationDelay: g.delay }}
                opacity="0"
              >
                {g.char}
              </text>
            ))}
          </g>

          {/* Scanner beam: soft band + hard line, translated in Y via keyframes */}
          <g clipPath="url(#page-clip)" className="natymd-scan-beam" style={{ transformOrigin: "50% 50%" }}>
            <rect x="40" y="40" width="200" height="18" fill="url(#beam-band)" />
            <line x1="40" y1="49" x2="240" y2="49" stroke="url(#beam-grad)" strokeWidth="1.4" />
            {/* tiny endpoint markers */}
            <circle cx="40" cy="49" r="1.6" fill="var(--color-brand)" />
            <circle cx="240" cy="49" r="1.6" fill="var(--color-brand)" />
          </g>

          {/* Tick marks on left ruler for a technical feel */}
          <g stroke="var(--color-border)" strokeWidth="0.6">
            {Array.from({ length: 11 }).map((_, i) => (
              <line
                key={i}
                x1={34}
                x2={i % 5 === 0 ? 40 : 37}
                y1={45 + i * 15}
                y2={45 + i * 15}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}