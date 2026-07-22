type Feature = {
  label: string;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    label: "STRUCTURED",
    title: "Real headings and lists",
    description: "Preserves document hierarchy — H1s, H2s, bullets, and code blocks stay intact.",
  },
  {
    label: "TOKEN-EFFICIENT",
    title: "Compact for LLMs",
    description:
      "Clean output with no bloat, ready to paste into ChatGPT, Claude, or your own pipeline.",
  },
  {
    label: "PRIVATE",
    title: "Nothing leaves your browser",
    description: "PDFs are parsed locally with WebAssembly — no server, no logging, no history.",
  },
];

export function FeatureCards() {
  return (
    <section className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
      {FEATURES.map((f, i) => (
        <div
          key={f.label}
          className="natymd-stagger group relative overflow-hidden rounded-md border border-border/70 bg-card/40 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:bg-card/60 hover:shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--brand)_35%,transparent)]"
          style={{ animationDelay: `${800 + i * 120}ms` }}
        >
          {/* corner tick */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-border/70 transition-colors group-hover:border-brand"
          />
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-2 w-2 bg-brand" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand">
              {f.label}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-foreground">{f.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.description}</p>
          {/* bottom scan-line accent on hover */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-brand to-transparent transition-transform duration-500 group-hover:scale-x-100"
          />
        </div>
      ))}
    </section>
  );
}
