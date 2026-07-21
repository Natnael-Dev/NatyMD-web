import { RotateCcw } from "lucide-react";

type Props = {
  filename: string;
  onStartOver: () => void;
};

export function ActionBar({ filename, onStartOver }: Props) {
  return (
    <header className="sticky top-0 z-10 flex min-h-[48px] w-full items-center justify-between border-b border-border/80 bg-background/85 px-4 py-2 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onStartOver}
        aria-label="Start over with another file"
        className="group inline-flex items-center gap-2 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-brand"
      >
        <RotateCcw className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-rotate-90" />
        <span className="underline decoration-transparent underline-offset-4 transition-all group-hover:decoration-brand">
          Start Over
        </span>
      </button>

      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60 hidden sm:block">
        NatyMD // client-side compiler
      </div>

      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-brand">
        status // calibrated
      </div>
    </header>
  );
}