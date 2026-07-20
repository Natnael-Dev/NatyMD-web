export function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <div
        className="natymd-stagger mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground backdrop-blur-sm"
        style={{ animationDelay: "160ms" }}
      >
        <span className="h-1 w-1 rounded-full bg-brand" />
        <span>pdf → markdown · in-browser</span>
      </div>

      <h1
        className="natymd-stagger text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl"
        style={{ animationDelay: "220ms" }}
      >
        <span className="relative inline-block">
          Upload a PDF,
          {/* glitch overlay flashes once on mount */}
          <span
            aria-hidden="true"
            className="natymd-glitch pointer-events-none absolute inset-0 text-brand/70"
          >
            Upload a PDF,
          </span>
        </span>{" "}
        <span className="text-brand">get clean Markdown.</span>
      </h1>

      <p
        className="natymd-stagger mt-6 max-w-xl text-pretty text-base text-muted-foreground md:text-lg"
        style={{ animationDelay: "360ms" }}
      >
        Everything runs in your browser. Your file never leaves your device.
      </p>

      <p
        className="natymd-stagger mt-3 font-mono text-xs text-muted-foreground/70"
        style={{ animationDelay: "500ms" }}
      >
        <span className="text-brand">$</span> parse ./document.pdf --out=markdown
        <span className="natymd-caret ml-1 inline-block h-3 w-1.5 -translate-y-[1px] bg-brand align-middle" />
      </p>
    </section>
  );
}