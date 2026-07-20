import { useEffect, useState } from "react";

const STORAGE_KEY = "natymd:include-images";

type Props = {
  onChange?: (value: boolean) => void;
};

export function IncludeImagesToggle({ onChange }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read persisted preference post-mount to avoid SSR hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const initial = raw === "1";
      setEnabled(initial);
      onChange?.(initial);
    } catch {
      /* localStorage blocked — stay at default OFF */
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    onChange?.(next);
  };

  return (
    <label
      className={[
        "group inline-flex cursor-pointer select-none items-center gap-3 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] transition-colors",
        enabled
          ? "border-brand/70 text-brand"
          : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground/80",
      ].join(" ")}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={enabled}
        onChange={(e) => handleToggle(e.target.checked)}
        aria-label="Include images in the exported markdown"
      />
      <span aria-hidden="true">[ include images ]</span>
      <span
        aria-hidden="true"
        className={[
          "relative inline-flex h-4 w-7 items-center rounded-full border transition-colors",
          enabled ? "border-brand bg-brand/[0.12]" : "border-border bg-background/60",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-[2px] transition-all duration-200",
            enabled
              ? "left-[calc(100%-14px)] bg-brand shadow-[0_0_8px_var(--color-brand)]"
              : "left-[1px] bg-muted-foreground/70",
            hydrated ? "" : "opacity-70",
          ].join(" ")}
        />
      </span>
    </label>
  );
}