export type TextItem = {
  page: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  bold: boolean;
  italic: boolean;
};

export type OcrProgressFn = (info: {
  phase: "loading" | "recognizing";
  progress: number; // 0..1
  page?: number; // current page (1-based) during recognizing
  totalPages?: number; // scanned page count
  status?: string; // raw tesseract status
}) => void;

export type ConvertOptions = {
  includeImages?: boolean;
  signal?: AbortSignal;
  ocr?: {
    enabled?: boolean; // default: true
    onOcrProgress?: OcrProgressFn;
    onScannedDetected?: (scannedPages: number[]) => void;
    signal?: AbortSignal;
  };
  /** Fires once, right before per-page image extraction begins (only when
   *  includeImages === true and at least one non-OCR page will be scanned). */
  onImageExtractStart?: () => void;
};

export type ConvertResult = {
  markdown: string;
  pageCount: number;
  warnings: string[];
  ocrPages?: number[];
  imageCount?: number;
  rawText?: string;
};

export type PageAnalysis = {
  page: number;
  scanned: boolean;
  textCharCount: number;
  hasImages: boolean;
};

/** Per-image record produced by extractPageImages(). Coordinates are in
 *  top-left origin (already flipped against pageHeight) so they merge
 *  directly with TextItem.y for reading-order interleaving. */
export type ExtractedImage = {
  page: number;
  y: number;
  index: number; // stable within the page (paint order)
  dataUrl?: string; // present on success
  error?: "unsupported" | "too-small" | "decode-failed";
};
