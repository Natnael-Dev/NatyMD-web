import { useEffect, useRef, useState } from "react";

type Props = {
  markdown: string;
  filename: string;
  onStartOver: () => void;
};

type CopyStatus = "idle" | "copied" | "failed";

export function ActionBar({ markdown, filename, onStartOver }: Props) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(markdown);
      } else {
        const ta = document.createElement("textarea");
        ta.value = markdown;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand failed");
      }
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyStatus("idle"), 1600);
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const base = filename.replace(/\.pdf$/i, "") || "document";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const copyLabel =
    copyStatus === "copied" ? "Copied ✓" : copyStatus === "failed" ? "Copy failed" : "Copy";
  const copyClass =
    copyStatus === "copied"
      ? "border-success text-success"
      : copyStatus === "failed"
        ? "border-destructive text-destructive"
        : "border-border text-foreground hover:border-brand hover:text-brand";

  return (
    <div className="sticky top-0 z-10 flex min-h-[52px] w-full flex-wrap items-center justify-between gap-2 border-b border-border bg-background/70 px-4 py-2 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onStartOver}
        aria-label="Start over"
        className="group inline-flex min-h-[44px] items-center gap-2 rounded-md px-2 py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-brand"
      >
        <span aria-hidden="true" className="text-base">◂</span>
        <span className="hidden underline decoration-transparent underline-offset-4 transition-all group-hover:decoration-brand sm:inline">
          Start Over
        </span>
      </button>

      <div className="flex items-center gap-2 font-mono text-xs">
        <button
          type="button"
          onClick={handleCopy}
          aria-live="polite"
          className={`rounded-md border px-4 py-2.5 uppercase tracking-[0.18em] transition-colors ${copyClass}`}
        >
          [ {copyLabel} ]
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-md border border-border px-4 py-2.5 uppercase tracking-[0.18em] text-foreground transition-colors hover:border-brand hover:text-brand"
        >
          <span className="sm:hidden">[ Download ]</span>
          <span className="hidden sm:inline">[ Download .md ]</span>
        </button>
      </div>
    </div>
  );
}