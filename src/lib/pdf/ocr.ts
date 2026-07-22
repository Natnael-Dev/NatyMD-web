import type { PDFDocumentProxy } from "pdfjs-dist";
import type { TextItem, OcrProgressFn } from "./types";

// Lazy-loaded OCR pipeline. Only imported when a scanned page is detected,
// so tesseract.js + its ~10 MB traineddata stay out of the initial bundle.

// Singleton worker; traineddata is cached to IndexedDB after the first run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let workerPromise: Promise<any> | null = null;
let unloadHooked = false;

function hookUnload() {
  if (unloadHooked || typeof window === "undefined") return;
  unloadHooked = true;
  window.addEventListener("beforeunload", () => {
    void terminateOcrWorker();
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getWorker(logger?: (m: any) => void) {
  if (workerPromise) return workerPromise;
  hookUnload();
  workerPromise = (async () => {
    const { createWorker } = await import("tesseract.js");
    return await createWorker("eng", 1, {
      logger,
      cacheMethod: "write",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  })();
  try {
    return await workerPromise;
  } catch (err) {
    workerPromise = null;
    throw err;
  }
}

export async function terminateOcrWorker() {
  if (!workerPromise) return;
  try {
    const w = await workerPromise;
    await w.terminate();
  } catch {
    /* ignore */
  } finally {
    workerPromise = null;
  }
}

function supportsOffscreenCanvas() {
  return typeof OffscreenCanvas !== "undefined";
}

// Rasterize at ~300 DPI. OffscreenCanvas keeps the main thread lighter;
// older Safari falls back to a detached HTMLCanvasElement.
async function renderPageToCanvas(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  scale = 3,
): Promise<{ canvas: OffscreenCanvas | HTMLCanvasElement; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (supportsOffscreenCanvas()) {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext("2d");
  } else {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext("2d");
  }
  if (!ctx) throw new Error("Could not acquire 2D context for OCR render");

  await page.render({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canvasContext: ctx as any,
    viewport,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any).promise;

  page.cleanup();
  return { canvas, width, height };
}

// Convert tesseract pixel bboxes back to 1×-scale PDF coords so they merge
// with items from extract.ts through itemsToMarkdown untouched.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tesseractLinesToItems(pageNum: number, data: any, scale: number): TextItem[] {
  const items: TextItem[] = [];
  const lines: unknown[] = data?.lines ?? [];
  for (const rawLine of lines) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const line = rawLine as any;
    const text: string = (line?.text ?? "").replace(/\s+$/g, "");
    if (!text) continue;
    const bbox = line?.bbox;
    if (!bbox) continue;
    const x = bbox.x0 / scale;
    const y = bbox.y0 / scale;
    const width = (bbox.x1 - bbox.x0) / scale;
    const height = Math.max(1, (bbox.y1 - bbox.y0) / scale);
    items.push({
      page: pageNum,
      text,
      x,
      y,
      width,
      height,
      fontSize: height,
      fontName: "OCR",
      bold: false,
      italic: false,
    });
  }
  return items;
}

export type OcrOptions = {
  onProgress?: OcrProgressFn;
  signal?: AbortSignal;
};

export async function ocrScannedPages(
  pdfDoc: PDFDocumentProxy,
  scannedPages: number[],
  { onProgress, signal }: OcrOptions = {},
): Promise<TextItem[]> {
  if (scannedPages.length === 0) return [];

  const checkAborted = () => {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };

  // recognize() has no cooperative cancel — terminate the worker on abort.
  const onAbort = () => {
    void terminateOcrWorker();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    checkAborted();

    const worker = await getWorker((m) => {
      const status: string = m?.status ?? "";
      const p: number = typeof m?.progress === "number" ? m.progress : 0;
      if (
        status.includes("loading") ||
        status.includes("initializing") ||
        status.includes("initialized") ||
        status.includes("downloading")
      ) {
        onProgress?.({ phase: "loading", progress: p, status });
      }
    });

    checkAborted();

    const scale = 3;
    const allItems: TextItem[] = [];
    for (let idx = 0; idx < scannedPages.length; idx++) {
      checkAborted();
      const pageNum = scannedPages[idx];
      const { canvas } = await renderPageToCanvas(pdfDoc, pageNum, scale);
      checkAborted();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyWorker = worker as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const input: any = canvas;

      const { data } = await anyWorker.recognize(input);
      checkAborted();

      onProgress?.({
        phase: "recognizing",
        progress: (idx + 1) / scannedPages.length,
        page: pageNum,
        totalPages: scannedPages.length,
        status: "page complete",
      });

      allItems.push(...tesseractLinesToItems(pageNum, data, scale));
    }

    return allItems;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await terminateOcrWorker();
  }
}
