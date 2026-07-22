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

  const checkAborted = () => {
    if (options.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
  };

  const buffer = await file.arrayBuffer();
  checkAborted();

  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableAutoFetch: true,
    disableStream: true,
  });
  const pdfDoc = await loadingTask.promise;
  checkAborted();

  try {
    const items = await extractTextItems(pdfDoc, options.signal);
    checkAborted();

    let ocrPages: number[] = [];
    let analyses: Awaited<ReturnType<typeof analyzePages>> | null = null;
    if (options.ocr?.enabled !== false) {
      analyses = await analyzePages(pdfDoc);
      checkAborted();
      const scanned = analyses.filter((a) => a.scanned).map((a) => a.page);
      if (scanned.length > 0) {
        options.ocr?.onScannedDetected?.(scanned);
        const { ocrScannedPages } = await import("./ocr");
        const ocrItems = await ocrScannedPages(pdfDoc, scanned, {
          onProgress: options.ocr?.onOcrProgress,
          signal: options.ocr?.signal,
        });
        checkAborted();
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
        checkAborted();
        try {
          const pageImgs = await extractPageImages(pdfDoc, p, {
            enabled: includeImages,
            signal: options.signal,
          });
          images.push(...pageImgs);
        } catch (e) {
          if ((e as Error)?.name === "AbortError") throw e;
          /* per-page failure never aborts the doc */
        }
      }
    }

    const rawText = items.map((it) => it.text).join(" ");
    const result = itemsToMarkdown(items, pdfDoc.numPages, images, includeImages);
    result.rawText = rawText;
    if (ocrPages.length > 0) result.ocrPages = ocrPages;
    return result;
  } finally {
    await pdfDoc.cleanup();
    await loadingTask.destroy();
  }
}
