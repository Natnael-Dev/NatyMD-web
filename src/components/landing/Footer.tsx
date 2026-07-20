export function Footer() {
  return (
    <footer
      className="natymd-stagger relative z-10 border-t border-border/60"
      style={{ animationDelay: "1400ms" }}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 md:flex-row">
        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-brand">//</span> Processed entirely in your browser.
          No server, no account, no history.
        </p>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span>local runtime · online</span>
        </div>
      </div>
    </footer>
  );
}