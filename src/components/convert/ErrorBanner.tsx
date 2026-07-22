export type ErrCode = "not_pdf" | "oversize" | "encrypted" | "parse_failed";
export type ConvError = { code: ErrCode; message: string };

type Props = {
  error: ConvError;
  onDismiss: () => void;
};

export function ErrorBanner({ error, onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="mx-auto mb-6 flex w-full max-w-2xl items-center gap-3 rounded-lg border px-4 py-3 text-sm"
      style={{
        borderColor: "color-mix(in oklab, var(--destructive) 55%, transparent)",
        backgroundColor: "color-mix(in oklab, var(--destructive) 8%, transparent)",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-2 w-2 shrink-0 rounded-full bg-destructive"
      />
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-destructive shrink-0">
        // error · {error.code}
      </span>
      <span className="flex-1 text-foreground/90">{error.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="rounded-sm px-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}
