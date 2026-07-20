// Same-origin bundled worker via Vite `?worker`. Browser-only.
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
import { GlobalWorkerOptions } from "pdfjs-dist";

let configured = false;

export function ensurePdfWorker() {
  if (configured) return;
  GlobalWorkerOptions.workerPort = new PdfWorker();
  configured = true;
}