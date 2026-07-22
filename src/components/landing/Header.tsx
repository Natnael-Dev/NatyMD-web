import { Wordmark } from "./Wordmark";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header
      className="natymd-stagger relative z-10 border-b border-border/60 backdrop-blur-sm"
      style={{ animationDelay: "60ms" }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
        <Wordmark />
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
            </span>
            <span>v0.1 · client-side</span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
