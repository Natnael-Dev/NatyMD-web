import type { ConvertResult } from "./types";

export type Stage =
  | "reading"
  | "analyzing"
  | "extracting"
  | "extracting-images"
  | "assembling"
  | "ocr-loading"
  | "ocr-recognizing";

export type ProgressMeta = {
  ocrPage?: number;
  ocrTotal?: number;
  scannedPages?: number[];
};

export type ProgressFn = (stage: Stage, progress: number, meta?: ProgressMeta) => void;

export type ConvertProgressOptions = {
  signal?: AbortSignal;
  includeImages?: boolean;
};

export async function convertWithProgress(
  file: File,
  onStage: ProgressFn,
  opts: ConvertProgressOptions = {},
): Promise<ConvertResult> {
  onStage("reading", 0);
  const { convertPdfToMarkdown } = await import("./parser");

  let scannedPages: number[] = [];
  let ocrActive = false;

  // Interpolated frontier for the long extract step — eases toward 0.82.
  let rafId = 0;
  let cancelled = false;
  const startExtracting = () => {
    onStage("extracting", 0.25);
    const t0 = performance.now();
    const tick = () => {
      if (cancelled || ocrActive) return;
      const elapsed = performance.now() - t0;
      const eased = 0.25 + 0.57 * (1 - Math.exp(-elapsed / 2400));
      onStage("extracting", Math.min(0.82, eased));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  };
  const stopExtracting = () => {
    cancelled = true;
    if (rafId) cancelAnimationFrame(rafId);
  };

  onStage("reading", 0.1);
  try {
    onStage("analyzing", 0.18);
    startExtracting();
    const result = await convertPdfToMarkdown(file, {
      includeImages: opts.includeImages ?? false,
      signal: opts.signal,
      onImageExtractStart: () => {
        stopExtracting();
        onStage("extracting-images", 0.86);
      },
      ocr: {
        enabled: true,
        signal: opts.signal,
        onScannedDetected: (pages) => {
          scannedPages = pages;
          ocrActive = true;
          stopExtracting();
          onStage("ocr-loading", 0.05, { scannedPages: pages });
        },
        onOcrProgress: ({ phase, progress, page, totalPages }) => {
          if (phase === "loading") {
            const p = 0.05 + Math.min(1, Math.max(0, progress)) * 0.15;
            onStage("ocr-loading", p, { scannedPages });
          } else {
            const p = 0.2 + Math.min(1, Math.max(0, progress)) * 0.7;
            onStage("ocr-recognizing", p, {
              scannedPages,
              ocrPage: page,
              ocrTotal: totalPages,
            });
          }
        },
      },
    });
    stopExtracting();
    onStage("assembling", 0.92);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    onStage("assembling", 1);
    return result;
  } catch (err) {
    stopExtracting();
    throw err;
  }
}