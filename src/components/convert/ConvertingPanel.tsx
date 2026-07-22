import type { Stage } from "@/lib/pdf/progress";
import { ScannerAnimation } from "./ScannerAnimation";

type Props = {
  file: File;
  stage: Stage;
  progress: number;
  elapsedMs: number;
  ocrPage?: number;
  ocrTotal?: number;
  scannedPages?: number[];
  includeImages?: boolean;
  onCancel: () => void;
};

type StageId = Stage;

const BASE_STAGES: Array<{ id: StageId; label: string }> = [
  { id: "reading", label: "reading file buffer" },
  { id: "analyzing", label: "analyzing document structure" },
  { id: "extracting", label: "extracting raw text" },
  { id: "assembling", label: "assembling markdown format" },
];

const IMAGE_STAGE: { id: StageId; label: string } = {
  id: "extracting-images",
  label: "extracting & downscaling images",
};

const OCR_STAGES: Array<{ id: StageId; label: string }> = [
  { id: "ocr-loading", label: "loading ocr engine (one-time)" },
  { id: "ocr-recognizing", label: "recognizing scanned pages" },
];

const CELLS = 40;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ConvertingPanel({
  file,
  stage,
  progress,
  elapsedMs,
  ocrPage,
  ocrTotal,
  scannedPages,
  includeImages,
  onCancel,
}: Props) {
  const isOcr = stage === "ocr-loading" || stage === "ocr-recognizing";
  const withImages = includeImages
    ? [...BASE_STAGES.slice(0, 3), IMAGE_STAGE, BASE_STAGES[3]]
    : BASE_STAGES;
  const stages =
    scannedPages && scannedPages.length > 0
      ? [...withImages.slice(0, 3), ...OCR_STAGES, ...withImages.slice(3)]
      : withImages;
  const activeIndex = stages.findIndex((s) => s.id === stage);
  const frontier = Math.floor(progress * CELLS);
  const pct = Math.round(progress * 100);

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div
        className="natymd-glow relative isolate overflow-hidden rounded-lg border border-brand bg-card/30 px-8 py-10 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        {/* Corner crosshairs */}
        {[
          "left-2 top-2 border-l border-t",
          "right-2 top-2 border-r border-t",
          "left-2 bottom-2 border-l border-b",
          "right-2 bottom-2 border-r border-b",
        ].map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`pointer-events-none absolute h-6 w-6 border-brand ${pos}`}
          />
        ))}

        {/* Filename */}
        <div className="mb-4 flex items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="truncate">
            <span className="text-brand">▸</span>{" "}
            <span className="text-foreground/80">{file.name}</span>
          </span>
          <span className="shrink-0">{formatSize(file.size)}</span>
        </div>

        {/* OCR banner — only when scanned pages are being processed */}
        {isOcr && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-md border border-brand/60 bg-brand/[0.06] px-4 py-3 text-left"
          >
            <span
              aria-hidden="true"
              className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-brand animate-pulse"
            />
            <div className="flex-1 text-xs leading-relaxed text-foreground/90">
              <p>
                <span className="font-semibold text-brand">Scanned document detected.</span> Loading
                OCR engine (10&nbsp;MB, one-time) — this takes ~5–10s per page. Nothing is uploaded.
              </p>
              {stage === "ocr-recognizing" && ocrTotal ? (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  // ocr · page {ocrPage ?? 0}/{ocrTotal}
                </p>
              ) : (
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  // ocr · engine loading
                </p>
              )}
            </div>
          </div>
        )}

        <ScannerAnimation />

        {/* Stage checklist */}
        <ul className="mt-6 space-y-1.5 font-mono text-xs">
          {stages.map((s, i) => {
            const done = i < activeIndex || (i === activeIndex && progress >= 1);
            const active = i === activeIndex && !done;
            const pending = i > activeIndex;
            return (
              <li
                key={s.id}
                className={[
                  "flex items-center gap-3 transition-colors",
                  done ? "text-brand" : active ? "text-foreground" : "text-muted-foreground/50",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex w-6 justify-center",
                    active ? "natymd-flicker text-brand" : "",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {done ? "[✓]" : active ? "[▸]" : "[ ]"}
                </span>
                <span className={pending ? "opacity-60" : ""}>
                  {s.label}
                  {s.id === "ocr-recognizing" && ocrTotal ? ` (${ocrPage ?? 0}/${ocrTotal})` : ""}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Segmented progress bar */}
        <div className="mt-6">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="flex h-3 gap-[2px]"
          >
            {Array.from({ length: CELLS }).map((_, i) => {
              const filled = i < frontier;
              const isFrontier = i === frontier;
              return (
                <span
                  key={i}
                  className={[
                    "h-full flex-1 rounded-[1px] transition-colors",
                    filled
                      ? "bg-brand"
                      : isFrontier
                        ? "natymd-cell-pulse bg-brand/60"
                        : "bg-border/70",
                  ].join(" ")}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="text-brand">
              // {stage} · {pct}%
            </span>
            <span className="flex items-center gap-4">
              <span>{(elapsedMs / 1000).toFixed(1)}s elapsed</span>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-destructive/50 px-2.5 py-1 text-destructive transition-colors hover:bg-destructive/[0.08] hover:border-destructive"
              >
                [ Cancel ]
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
