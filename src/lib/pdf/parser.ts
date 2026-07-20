import type { ConvertOptions, ConvertResult } from "./types";
import { ensurePdfWorker } from "./worker";
import { extractTextItems, analyzePages, extractPageImages } from "./extract";
import { itemsToMarkdown } from "./markdown";

// Browser-only. Dynamically import from a client event handler so
// pdfjs-dist and the `?worker` chunk stay out of the SSR graph.
export async function convertPdfToMarkdown(
  file: File,
  options: ConvertOptions = {},
): Promise<ConvertResult> {
  ensurePdfWorker();
  const { getDocument } = await import("pdfjs-dist");

  const buffer = await file.arrayBuffer();
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableAutoFetch: true,
    disableStream: true,
  });
  const pdfDoc = await loadingTask.promise;

  try {
    const items = await extractTextItems(pdfDoc);

    let ocrPages: number[] = [];
    let analyses: Awaited<ReturnType<typeof analyzePages>> | null = null;
    if (options.ocr?.enabled !== false) {
      analyses = await analyzePages(pdfDoc);
      const scanned = analyses.filter((a) => a.scanned).map((a) => a.page);
      if (scanned.length > 0) {
        options.ocr?.onScannedDetected?.(scanned);
        const { ocrScannedPages } = await import("./ocr");
        const ocrItems = await ocrScannedPages(pdfDoc, scanned, {
          onProgress: options.ocr?.onOcrProgress,
          signal: options.ocr?.signal,
        });
        items.push(...ocrItems);
        ocrPages = scanned;
      }
    }

    const ocrSet = new Set(ocrPages);
    const images = [] as Awaited<ReturnType<typeof extractPageImages>>;
    const includeImages = options.includeImages ?? false;
    const pagesToScan: number[] = [];
    for (let p = 1; p <= pdfDoc.numPages; p++) {
      if (!ocrSet.has(p)) pagesToScan.push(p);
    }
    if (pagesToScan.length > 0) {
      if (includeImages) options.onImageExtractStart?.();
      for (const p of pagesToScan) {
        try {
          const pageImgs = await extractPageImages(pdfDoc, p, { enabled: includeImages });
          images.push(...pageImgs);
        } catch { /* per-page failure never aborts the doc */ }
      }
    }

    const result = itemsToMarkdown(items, pdfDoc.numPages, images, includeImages);
    if (ocrPages.length > 0) result.ocrPages = ocrPages;
    return result;
  } finally {
    await pdfDoc.cleanup();
    await loadingTask.destroy();
  }
}