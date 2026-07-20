const ITEMS = [
  {
    title: "Token counter",
    description: "See the token cost of your Markdown before you paste it.",
  },
  {
    title: "Preserve page breaks",
    description: "Optional markers to keep the original PDF pagination.",
  },
  {
    title: "URL to Markdown",
    description: "Point at a hosted PDF and convert without a local file.",
  },
];

export function ComingSoon() {
  return (
    <section
      className="natymd-stagger mx-auto w-full max-w-4xl"
      style={{ animationDelay: "1200ms" }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border/60" />
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          // coming soon
        </span>
        <span className="h-px flex-1 bg-border/60" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            aria-disabled="true"
            className="relative cursor-not-allowed overflow-hidden rounded-md border border-dashed border-border/70 bg-card/10 p-6 select-none"
          >
            {/* diagonal hatch overlay — reads as "disabled" */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(45deg,var(--color-foreground)_0_1px,transparent_1px_8px)]"
            />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="natymd-flicker absolute inline-flex h-full w-full rounded-full bg-brand/70" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
                  progress · n/a
                </span>
              </div>
              <span className="rounded border border-border/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                soon
              </span>
            </div>
            <h3 className="relative mt-4 text-base font-semibold text-muted-foreground/80">
              {item.title}
            </h3>
            <p className="relative mt-1.5 text-sm text-muted-foreground/60">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}